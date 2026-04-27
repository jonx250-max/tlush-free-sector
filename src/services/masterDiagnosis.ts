// Master Diagnosis Runner — composes diffEngine + Phase B engines into unified result.
//
// Each Phase-B check is implemented as a small private builder that takes
// the slice of inputs it needs and returns AnalysisFinding[]. The
// orchestrator below stays a flat dispatcher so every conditional path
// is independently testable via mocked calculator imports.

import type { ContractTerms, ParsedPayslip, AnalysisFinding, DiffResult } from '../types'
import { compare, type ProfileData } from './diffEngine'
import { calculateSeverance } from './severanceCalculator'
import { calculateHolidayPay } from './holidayPayCalculator'
import { calculateCommute } from './commuteCalculator'
import { calculateAdvanceNotice } from './advanceNoticeCalculator'
import { calculateHolidayGift } from './holidayGiftCalculator'
import { calculateThirteenthSalary } from './thirteenthSalaryCalculator'
import { calculateShiftDifferential } from './shiftDifferentialCalculator'
import { detectIllegalDeductions } from './illegalDeductionsDetector'
import { formatIls, round2 } from '../lib/numbers'

export interface MasterDiagnosisOptions {
  isTermination?: boolean
  terminationDate?: string | null
  workDaysInMonth?: number
}

interface DerivedRates {
  monthsEmployed: number
  baseGross: number
  dailyWage: number
  hourlyRate: number
}

export function runMasterDiagnosis(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  profile: ProfileData,
  year: number,
  options: MasterDiagnosisOptions = {},
): DiffResult {
  const base = compare(contract, payslip, profile, year)
  const rates = deriveRates(contract, payslip)

  const extra: AnalysisFinding[] = [
    ...buildSeveranceAndNoticeFindings(contract, payslip, rates, options),
    ...buildHolidayPayFindings(contract, rates),
    ...buildCommuteFindings(contract, payslip, options),
    ...buildHolidayGiftFindings(contract, payslip),
    ...buildThirteenthSalaryFindings(contract, payslip, rates),
    ...buildShiftDifferentialFindings(contract, rates),
    ...buildIllegalDeductionFindings(payslip),
  ]

  const allFindings = [...base.findings, ...extra]
  return {
    findings: allFindings,
    summary: rebuildSummary(allFindings),
    overtimeAnalysis: base.overtimeAnalysis,
    taxAnalysis: base.taxAnalysis,
  }
}

function deriveRates(contract: ContractTerms, payslip: ParsedPayslip): DerivedRates {
  const baseGross = payslip.basePay ?? contract.baseSalary.value
  return {
    monthsEmployed: monthsSince(contract.effectiveDate.value, payslip.year, payslip.month),
    baseGross,
    dailyWage: contract.workDaysPerWeek.value === 6 ? baseGross / 25 : baseGross / 22,
    hourlyRate: baseGross / 182,
  }
}

function buildSeveranceAndNoticeFindings(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  rates: DerivedRates,
  options: MasterDiagnosisOptions,
): AnalysisFinding[] {
  if (!options.isTermination || !options.terminationDate) return []
  const findings: AnalysisFinding[] = []

  const sev = calculateSeverance({
    lastMonthlyGross: payslip.grossSalary,
    startDate: contract.effectiveDate.value,
    terminationDate: options.terminationDate,
    pensionSeveranceAccrued: payslip.severanceEmployer ?? 0,
    isTerminatedByEmployer: true,
  })
  if (sev.shortfall > 0) {
    findings.push({
      category: 'severance',
      fieldName: 'פיצויי פיטורין',
      contractValue: sev.expectedSeverance,
      payslipValue: sev.alreadyAccrued,
      gap: sev.shortfall,
      gapDirection: 'underpaid',
      severity: 'critical',
      legalReference: 'חוק פיצויי פיטורים תשכ"ג-1963',
      explanation: `פיצויים צפויים: ${formatIls(sev.expectedSeverance)} ₪ עבור ${sev.yearsOfService} שנות עבודה. נצברו: ${formatIls(sev.alreadyAccrued)} ₪. חסר: ${formatIls(sev.shortfall)} ₪`,
    })
  }
  if (sev.form161Taxable > 0) {
    findings.push({
      category: 'severance_form_161',
      fieldName: 'טופס 161 — חלק חייב במס',
      contractValue: sev.form161TaxFreeCeiling,
      payslipValue: sev.form161Taxable,
      gap: sev.form161Taxable,
      gapDirection: 'not_in_contract',
      severity: 'info',
      legalReference: 'תקנות מס הכנסה — קצובת פטור',
      explanation: `מחלק הפיצויים מעבר לתקרת הפטור (${formatIls(sev.form161TaxFreeCeiling)} ₪) חייב במס: ${formatIls(sev.form161Taxable)} ₪. שקול פריסה.`,
    })
  }

  const notice = calculateAdvanceNotice({
    monthsEmployed: rates.monthsEmployed,
    contractNoticeDays: contract.noticePeriodDays.value,
    payslipNoticePay: 0,
    lastDailyWage: rates.dailyWage,
    isMonthlyEmployee: contract.payModel.value === 'monthly' || contract.payModel.value === 'global',
  })
  if (notice.shortfall > 0) {
    findings.push({
      category: 'advance_notice',
      fieldName: 'הודעה מוקדמת',
      contractValue: notice.expectedNoticePay,
      payslipValue: notice.actualNoticePay,
      gap: notice.shortfall,
      gapDirection: 'underpaid',
      severity: 'critical',
      legalReference: 'חוק הודעה מוקדמת לפיטורים תשס"א-2001',
      explanation: `הודעה מוקדמת: ${notice.applicableDays} ימים × ${rates.dailyWage.toFixed(0)} ₪ = ${formatIls(notice.expectedNoticePay)} ₪`,
    })
  }
  return findings
}

function buildHolidayPayFindings(contract: ContractTerms, rates: DerivedRates): AnalysisFinding[] {
  if (contract.payModel.value !== 'hourly' && contract.payModel.value !== 'shift') return []

  const hp = calculateHolidayPay({
    payModel: contract.payModel.value,
    monthsEmployed: rates.monthsEmployed,
    hourlyRate: contract.hourlyRate.value,
    hoursPerDay: contract.workDaysPerWeek.value === 6 ? 7.5 : 8.4,
    payslipHolidayPay: null,
    holidayDaysInMonth: 0,
  })
  if (hp.shortfall <= 0) return []
  return [{
    category: 'holiday_pay',
    fieldName: 'דמי חגים',
    contractValue: hp.expectedHolidayPay,
    payslipValue: hp.actualHolidayPay,
    gap: hp.shortfall,
    gapDirection: 'underpaid',
    severity: 'warning',
    legalReference: 'צו הרחבה כללי 1972 — דמי חגים',
    explanation: hp.reason,
  }]
}

function buildCommuteFindings(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  options: MasterDiagnosisOptions,
): AnalysisFinding[] {
  const commute = calculateCommute({
    workDaysInMonth: options.workDaysInMonth ?? 22,
    monthlyTravelCardCost: contract.travelAllowance.value,
    payslipTravelAllowance: payslip.travelAllowance,
  })
  if (!commute.hasData || commute.shortfall <= 50) return []
  return [{
    category: 'commute_reimbursement',
    fieldName: 'החזר נסיעות',
    contractValue: commute.expectedReimbursement,
    payslipValue: commute.actualReimbursement,
    gap: commute.shortfall,
    gapDirection: 'underpaid',
    severity: 'warning',
    legalReference: 'צו הרחבה הסכם תחבורה',
    explanation: `החזר נסיעות צפוי: ${commute.expectedReimbursement.toFixed(0)} ₪. בתלוש: ${commute.actualReimbursement.toFixed(0)} ₪.`,
  }]
}

function buildHolidayGiftFindings(contract: ContractTerms, payslip: ParsedPayslip): AnalysisFinding[] {
  const giftClause = contract.specialClauses.some(c => c.includes('שי') || c.includes('חג'))
  if (!giftClause) return []

  const gift = calculateHolidayGift({
    contractMentionsGift: true,
    expectedGiftValue: 200,
    payslipGiftEntries: payslip.entries
      .filter(e => e.name.includes('שי') || e.name.includes('חג'))
      .reduce((s, e) => s + e.amount, 0),
    monthsInPeriod: 1,
    isHolidayMonth: [3, 4, 9, 10].includes(payslip.month),
  })
  if (gift.shortfall <= 0) return []
  return [{
    category: 'holiday_gift',
    fieldName: 'שי לחג',
    contractValue: gift.expectedValue,
    payslipValue: gift.actualValue,
    gap: gift.shortfall,
    gapDirection: 'underpaid',
    severity: 'info',
    legalReference: 'נוהג / הסכם קיבוצי',
    explanation: gift.note,
  }]
}

function buildThirteenthSalaryFindings(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  rates: DerivedRates,
): AnalysisFinding[] {
  const has13th = contract.specialClauses.some(
    c => c.includes('13') || c.includes('משכורת שלוש') || c.includes('שלוש עשרה'),
  )
  const t13 = calculateThirteenthSalary({
    contractMentions13thSalary: has13th,
    expectedAmount: null,
    payslipBonusPay: payslip.bonusPay ?? 0,
    monthlyBaseGross: rates.baseGross,
    monthOfYear: payslip.month,
    expectedPaymentMonths: [12],
  })
  if (t13.shortfall <= 0) return []
  return [{
    category: 'thirteenth_salary',
    fieldName: 'משכורת 13',
    contractValue: t13.expectedAmount,
    payslipValue: t13.actualAmount,
    gap: t13.shortfall,
    gapDirection: 'underpaid',
    severity: 'warning',
    legalReference: 'חוזה / הסכם קיבוצי',
    explanation: `משכורת 13 צפויה: ${formatIls(t13.expectedAmount)} ₪. שולם: ${formatIls(t13.actualAmount)} ₪.`,
  }]
}

function buildShiftDifferentialFindings(contract: ContractTerms, rates: DerivedRates): AnalysisFinding[] {
  if (contract.payModel.value !== 'shift') return []

  const shift = calculateShiftDifferential({
    eveningShiftHours: 0,
    nightShiftHours: 0,
    hourlyRate: rates.hourlyRate,
    payslipShiftDifferential: null,
    eveningPremiumPct: 25,
    nightPremiumPct: 50,
  })
  if (!shift.hasShifts || shift.shortfall <= 0) return []
  return [{
    category: 'shift_differential',
    fieldName: 'תוספת ערב/לילה',
    contractValue: shift.expectedDifferential,
    payslipValue: shift.actualDifferential,
    gap: shift.shortfall,
    gapDirection: 'underpaid',
    severity: 'warning',
    legalReference: 'חוק שעות עבודה ומנוחה',
    explanation: `תוספת משמרות צפויה: ${formatIls(shift.expectedDifferential)} ₪`,
  }]
}

function buildIllegalDeductionFindings(payslip: ParsedPayslip): AnalysisFinding[] {
  const illegal = detectIllegalDeductions(payslip.entries)
  return illegal.suspiciousDeductions.map(d => ({
    category: 'illegal_deduction',
    fieldName: `ניכוי חשוד: ${d.name}`,
    contractValue: 0,
    payslipValue: d.amount,
    gap: d.amount,
    gapDirection: 'overpaid',
    severity: 'warning',
    legalReference: 'חוק הגנת השכר תשי"ח-1958, סעיף 25',
    explanation: d.reason,
  }))
}

function monthsSince(startDate: string, year: number, month: number): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const ref = new Date(year, month - 1, 1)
  return Math.max(0, (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth()))
}

function rebuildSummary(findings: AnalysisFinding[]) {
  const critical = findings.filter(f => f.severity === 'critical').length
  const warning = findings.filter(f => f.severity === 'warning').length
  const info = findings.filter(f => f.severity === 'info').length
  const totalGapAmount = findings
    .filter(f => f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip')
    .reduce((sum, f) => sum + f.gap, 0)
  return {
    totalFindings: findings.length,
    critical, warning, info,
    totalGapAmount: round2(totalGapAmount),
  }
}
