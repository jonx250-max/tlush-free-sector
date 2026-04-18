// Master Diagnosis Runner — composes diffEngine + Phase B engines into unified result.

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

export interface MasterDiagnosisOptions {
  isTermination?: boolean
  terminationDate?: string | null
  workDaysInMonth?: number
}

export function runMasterDiagnosis(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  profile: ProfileData,
  year: number,
  options: MasterDiagnosisOptions = {},
): DiffResult {
  const base = compare(contract, payslip, profile, year)
  const extra: AnalysisFinding[] = []

  const monthsEmployed = monthsSince(contract.effectiveDate.value, payslip.year, payslip.month)
  const baseGross = payslip.basePay ?? contract.baseSalary.value
  const dailyWage = contract.workDaysPerWeek.value === 6 ? baseGross / 25 : baseGross / 22
  const hourlyRate = baseGross / 182

  // Severance + Form 161
  if (options.isTermination && options.terminationDate) {
    const sev = calculateSeverance({
      lastMonthlyGross: payslip.grossSalary,
      startDate: contract.effectiveDate.value,
      terminationDate: options.terminationDate,
      pensionSeveranceAccrued: payslip.severanceEmployer ?? 0,
      isTerminatedByEmployer: true,
    })
    if (sev.shortfall > 0) {
      extra.push({
        category: 'severance',
        fieldName: 'פיצויי פיטורין',
        contractValue: sev.expectedSeverance,
        payslipValue: sev.alreadyAccrued,
        gap: sev.shortfall,
        gapDirection: 'underpaid',
        severity: 'critical',
        legalReference: 'חוק פיצויי פיטורים תשכ"ג-1963',
        explanation: `פיצויים צפויים: ${sev.expectedSeverance.toLocaleString('he-IL')} ₪ עבור ${sev.yearsOfService} שנות עבודה. נצברו: ${sev.alreadyAccrued.toLocaleString('he-IL')} ₪. חסר: ${sev.shortfall.toLocaleString('he-IL')} ₪`,
      })
    }
    if (sev.form161Taxable > 0) {
      extra.push({
        category: 'severance_form_161',
        fieldName: 'טופס 161 — חלק חייב במס',
        contractValue: sev.form161TaxFreeCeiling,
        payslipValue: sev.form161Taxable,
        gap: sev.form161Taxable,
        gapDirection: 'not_in_contract',
        severity: 'info',
        legalReference: 'תקנות מס הכנסה — קצובת פטור',
        explanation: `מחלק הפיצויים מעבר לתקרת הפטור (${sev.form161TaxFreeCeiling.toLocaleString('he-IL')} ₪) חייב במס: ${sev.form161Taxable.toLocaleString('he-IL')} ₪. שקול פריסה.`,
      })
    }
    const notice = calculateAdvanceNotice({
      monthsEmployed,
      contractNoticeDays: contract.noticePeriodDays.value,
      payslipNoticePay: 0,
      lastDailyWage: dailyWage,
      isMonthlyEmployee: contract.payModel.value === 'monthly' || contract.payModel.value === 'global',
    })
    if (notice.shortfall > 0) {
      extra.push({
        category: 'advance_notice',
        fieldName: 'הודעה מוקדמת',
        contractValue: notice.expectedNoticePay,
        payslipValue: notice.actualNoticePay,
        gap: notice.shortfall,
        gapDirection: 'underpaid',
        severity: 'critical',
        legalReference: 'חוק הודעה מוקדמת לפיטורים תשס"א-2001',
        explanation: `הודעה מוקדמת: ${notice.applicableDays} ימים × ${dailyWage.toFixed(0)} ₪ = ${notice.expectedNoticePay.toLocaleString('he-IL')} ₪`,
      })
    }
  }

  // Holiday pay (hourly/shift workers only)
  if (contract.payModel.value === 'hourly' || contract.payModel.value === 'shift') {
    const hp = calculateHolidayPay({
      payModel: contract.payModel.value,
      monthsEmployed,
      hourlyRate: contract.hourlyRate.value,
      hoursPerDay: contract.workDaysPerWeek.value === 6 ? 7.5 : 8.4,
      payslipHolidayPay: null,
      holidayDaysInMonth: 0,
    })
    if (hp.shortfall > 0) {
      extra.push({
        category: 'holiday_pay',
        fieldName: 'דמי חגים',
        contractValue: hp.expectedHolidayPay,
        payslipValue: hp.actualHolidayPay,
        gap: hp.shortfall,
        gapDirection: 'underpaid',
        severity: 'warning',
        legalReference: 'צו הרחבה כללי 1972 — דמי חגים',
        explanation: hp.reason,
      })
    }
  }

  // Commute
  const commute = calculateCommute({
    workDaysInMonth: options.workDaysInMonth ?? 22,
    monthlyTravelCardCost: contract.travelAllowance.value,
    payslipTravelAllowance: payslip.travelAllowance,
  })
  if (commute.hasData && commute.shortfall > 50) {
    extra.push({
      category: 'commute_reimbursement',
      fieldName: 'החזר נסיעות',
      contractValue: commute.expectedReimbursement,
      payslipValue: commute.actualReimbursement,
      gap: commute.shortfall,
      gapDirection: 'underpaid',
      severity: 'warning',
      legalReference: 'צו הרחבה הסכם תחבורה',
      explanation: `החזר נסיעות צפוי: ${commute.expectedReimbursement.toFixed(0)} ₪. בתלוש: ${commute.actualReimbursement.toFixed(0)} ₪.`,
    })
  }

  // Holiday gift (informational; needs contract clause)
  const giftClause = contract.specialClauses.some(c => c.includes('שי') || c.includes('חג'))
  if (giftClause) {
    const isHolidayMonth = [3, 4, 9, 10].includes(payslip.month)
    const gift = calculateHolidayGift({
      contractMentionsGift: true,
      expectedGiftValue: 200,
      payslipGiftEntries: payslip.entries.filter(e => e.name.includes('שי') || e.name.includes('חג')).reduce((s, e) => s + e.amount, 0),
      monthsInPeriod: 1,
      isHolidayMonth,
    })
    if (gift.shortfall > 0) {
      extra.push({
        category: 'holiday_gift',
        fieldName: 'שי לחג',
        contractValue: gift.expectedValue,
        payslipValue: gift.actualValue,
        gap: gift.shortfall,
        gapDirection: 'underpaid',
        severity: 'info',
        legalReference: 'נוהג / הסכם קיבוצי',
        explanation: gift.note,
      })
    }
  }

  // 13th salary
  const has13th = contract.specialClauses.some(c => c.includes('13') || c.includes('משכורת שלוש') || c.includes('שלוש עשרה'))
  const t13 = calculateThirteenthSalary({
    contractMentions13thSalary: has13th,
    expectedAmount: null,
    payslipBonusPay: payslip.bonusPay ?? 0,
    monthlyBaseGross: baseGross,
    monthOfYear: payslip.month,
    expectedPaymentMonths: [12],
  })
  if (t13.shortfall > 0) {
    extra.push({
      category: 'thirteenth_salary',
      fieldName: 'משכורת 13',
      contractValue: t13.expectedAmount,
      payslipValue: t13.actualAmount,
      gap: t13.shortfall,
      gapDirection: 'underpaid',
      severity: 'warning',
      legalReference: 'חוזה / הסכם קיבוצי',
      explanation: `משכורת 13 צפויה: ${t13.expectedAmount.toLocaleString('he-IL')} ₪. שולם: ${t13.actualAmount.toLocaleString('he-IL')} ₪.`,
    })
  }

  // Shift differential
  if (contract.payModel.value === 'shift') {
    const shift = calculateShiftDifferential({
      eveningShiftHours: 0,
      nightShiftHours: 0,
      hourlyRate,
      payslipShiftDifferential: null,
      eveningPremiumPct: 25,
      nightPremiumPct: 50,
    })
    if (shift.hasShifts && shift.shortfall > 0) {
      extra.push({
        category: 'shift_differential',
        fieldName: 'תוספת ערב/לילה',
        contractValue: shift.expectedDifferential,
        payslipValue: shift.actualDifferential,
        gap: shift.shortfall,
        gapDirection: 'underpaid',
        severity: 'warning',
        legalReference: 'חוק שעות עבודה ומנוחה',
        explanation: `תוספת משמרות צפויה: ${shift.expectedDifferential.toLocaleString('he-IL')} ₪`,
      })
    }
  }

  // Illegal deductions
  const illegal = detectIllegalDeductions(payslip.entries)
  for (const d of illegal.suspiciousDeductions) {
    extra.push({
      category: 'illegal_deduction',
      fieldName: `ניכוי חשוד: ${d.name}`,
      contractValue: 0,
      payslipValue: d.amount,
      gap: d.amount,
      gapDirection: 'overpaid',
      severity: 'warning',
      legalReference: 'חוק הגנת השכר תשי"ח-1958, סעיף 25',
      explanation: d.reason,
    })
  }

  const allFindings = [...base.findings, ...extra]
  return {
    findings: allFindings,
    summary: rebuildSummary(allFindings),
    overtimeAnalysis: base.overtimeAnalysis,
    taxAnalysis: base.taxAnalysis,
  }
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
    totalGapAmount: Math.round(totalGapAmount * 100) / 100,
  }
}
