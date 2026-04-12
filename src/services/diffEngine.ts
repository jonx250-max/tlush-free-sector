// ============================================================
// Diff Engine — Contract vs Payslip Comparison
// Core analysis engine that finds all gaps
// ============================================================

import type {
  ContractTerms,
  ParsedPayslip,
  AnalysisFinding,
  FindingCategory,
  Severity,
  GapDirection,
  DiffResult,
  DiffSummary,
  OvertimeAnalysis,
  TaxAnalysis,
} from '../types'
import { calculateIncomeTax, calculateCreditPoints, calculateRegionalBenefit } from './taxCalculator'
import type { CreditPointsInput } from './taxCalculator'
import { calculateNationalInsurance, calculateHealthInsurance } from './deductionsCalculator'
import { validateAmendment24 } from './amendment24Validator'
import { analyzeCommissions } from './commissionCalculator'
import { calculateOvertime, validateGlobalOvertime } from './overtimeCalculator'
import { validateMinimumWage } from './minimumWageValidator'
import type { Settlement } from '../data/settlements'

export interface ProfileData {
  gender: 'male' | 'female'
  childrenBirthYears: number[]
  academicDegree: 'none' | 'ba' | 'ma' | 'phd'
  degreeCompletionYear: number | null
  militaryService: { served: boolean; dischargeYear: number | null; monthsServed: number; isCombat: boolean }
  isNewImmigrant: boolean
  immigrationDate: string | null
  disabilityPercentage: number
  isSingleParent: boolean
  reservistDays2026: number
  settlement: Settlement | null
  yearsOfService: number
  workDaysPerWeek: 5 | 6
}

const TOLERANCE = 50 // ₪ tolerance for "match"

export function compare(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  profile: ProfileData,
  year: number,
): DiffResult {
  const findings: AnalysisFinding[] = []

  // 1. Base pay
  compareField(
    'base_pay', 'שכר בסיס',
    contract.baseSalary.value, payslip.basePay,
    findings, 'critical',
    'חוק הגנת השכר, סעיף 5',
  )

  // 2. Minimum wage check
  const minWage = validateMinimumWage(payslip.grossSalary, year, profile.workDaysPerWeek)
  if (!minWage.isAboveMinimum) {
    findings.push({
      category: 'minimum_wage',
      fieldName: 'שכר מינימום',
      contractValue: minWage.minimumWage,
      payslipValue: payslip.grossSalary,
      gap: minWage.shortfall,
      gapDirection: 'underpaid',
      severity: 'critical',
      legalReference: 'חוק שכר מינימום, התשמ"ז-1987',
      explanation: `שכר ברוטו (${payslip.grossSalary} ₪) נמוך משכר המינימום (${minWage.minimumWage} ₪)`,
    })
  }

  // 3. Amendment 24 check
  const amendment24 = validateAmendment24(
    contract.overtimeModel.value,
    payslip.basePay,
    payslip.globalOvertimeLine,
    payslip.grossSalary,
  )
  if (!amendment24.compliant) {
    findings.push({
      category: 'amendment24',
      fieldName: 'תיקון 24 — הפרדת שעות נוספות',
      contractValue: null,
      payslipValue: null,
      gap: 0,
      gapDirection: 'missing_from_payslip',
      severity: 'critical',
      legalReference: amendment24.legalReference,
      explanation: amendment24.explanation,
    })
  }

  // 4. Commission analysis
  if (payslip.commissionPay && payslip.commissionPay > 0) {
    const commResult = analyzeCommissions(
      payslip.basePay ?? 0,
      payslip.commissionPay,
      payslip.pensionEmployee ?? 0,
      contract.pensionEmployeePct.value / 100,
    )
    if (!commResult.isIncludedInPensionBase) {
      findings.push({
        category: 'commission',
        fieldName: 'עמלות לא נכללות בבסיס לפנסיה',
        contractValue: null,
        payslipValue: payslip.commissionPay,
        gap: commResult.pensionShortfall,
        gapDirection: 'underpaid',
        severity: 'critical',
        legalReference: 'פסיקת בית הדין הארצי לעבודה — עמלות הן חלק מהשכר הקובע',
        explanation: `עמלות בסך ${payslip.commissionPay} ₪ לא נכללו בבסיס חישוב הפנסיה. חסר: ${commResult.pensionShortfall} ₪`,
      })
    }
  }

  // 5. Overtime analysis
  const overtimeAnalysis = buildOvertimeAnalysis(contract, payslip, profile)

  if (contract.overtimeModel.value === 'global' && contract.globalOvertimeHours.value) {
    const globalValidation = validateGlobalOvertime(
      contract.globalOvertimeHours.value,
      contract.globalOvertimeAmount.value ?? 0,
      contract.baseSalary.value,
      payslip.commissionPay ?? 0,
      profile.workDaysPerWeek,
    )
    if (!globalValidation.isAmountSufficient) {
      findings.push({
        category: 'global_overtime',
        fieldName: 'שעות נוספות גלובליות — סכום לא מספיק',
        contractValue: globalValidation.minimumOvertimePay,
        payslipValue: contract.globalOvertimeAmount.value ?? 0,
        gap: globalValidation.shortfall,
        gapDirection: 'underpaid',
        severity: 'warning',
        legalReference: 'חוק שעות עבודה ומנוחה — סעיף 16',
        explanation: `סכום השעות הנוספות הגלובליות (${contract.globalOvertimeAmount.value} ₪) נמוך מהמינימום החוקי (${globalValidation.minimumOvertimePay} ₪)`,
      })
    }
  }

  // 6. Pension comparison
  compareField(
    'pension_employee', 'פנסיה עובד',
    contract.baseSalary.value * (contract.pensionEmployeePct.value / 100),
    payslip.pensionEmployee,
    findings, 'warning',
    'צו הרחבה לביטוח פנסיוני מקיף',
  )

  compareField(
    'pension_employer', 'פנסיה מעסיק',
    contract.baseSalary.value * (contract.pensionEmployerPct.value / 100),
    payslip.pensionEmployer,
    findings, 'warning',
    'צו הרחבה לביטוח פנסיוני מקיף',
  )

  // 7. Keren Hishtalmut
  if (contract.kerenHishtalmutEmployeePct.value) {
    compareField(
      'keren_hishtalmut', 'קרן השתלמות עובד',
      contract.baseSalary.value * (contract.kerenHishtalmutEmployeePct.value / 100),
      payslip.kerenHishtalmutEmployee,
      findings, 'warning',
      'צו הרחבה לקרן השתלמות',
    )
  }

  // 8. Tax analysis
  const taxAnalysis = buildTaxAnalysis(payslip, profile, year)
  if (taxAnalysis.overcharge > TOLERANCE) {
    findings.push({
      category: 'income_tax',
      fieldName: 'מס הכנסה ביתר',
      contractValue: taxAnalysis.expectedTax,
      payslipValue: taxAnalysis.actualTax,
      gap: taxAnalysis.overcharge,
      gapDirection: 'overpaid',
      severity: 'warning',
      legalReference: 'פקודת מס הכנסה',
      explanation: `נוכה מס ${taxAnalysis.actualTax} ₪ במקום ${taxAnalysis.expectedTax} ₪ — ייתכן שחסרות נקודות זיכוי`,
    })
  }

  // 9. Benefits comparison
  compareField('travel', 'החזר נסיעות', contract.travelAllowance.value, payslip.travelAllowance, findings, 'info', 'צו הרחבה — החזר נסיעות')
  compareField('meals', 'דמי כלכלה', contract.mealAllowance.value, payslip.mealAllowance, findings, 'info')
  compareField('phone', 'החזר טלפון', contract.phoneAllowance.value, payslip.phoneAllowance, findings, 'info')

  // Build summary
  const summary = buildSummary(findings)

  return { findings, summary, overtimeAnalysis, taxAnalysis }
}

function compareField(
  category: FindingCategory,
  fieldName: string,
  contractValue: number | null,
  payslipValue: number | null,
  findings: AnalysisFinding[],
  severity: Severity,
  legalReference?: string,
): void {
  if (contractValue === null || contractValue === undefined) return

  const actual = payslipValue ?? 0
  const gap = Math.round((contractValue - actual) * 100) / 100

  let gapDirection: GapDirection
  if (Math.abs(gap) < TOLERANCE) {
    gapDirection = 'match'
  } else if (payslipValue === null) {
    gapDirection = 'missing_from_payslip'
  } else if (gap > 0) {
    gapDirection = 'underpaid'
  } else {
    gapDirection = 'overpaid'
  }

  if (gapDirection !== 'match') {
    findings.push({
      category,
      fieldName,
      contractValue,
      payslipValue: actual,
      gap: Math.abs(gap),
      gapDirection,
      severity,
      legalReference: legalReference ?? null,
      explanation: gapDirection === 'underpaid'
        ? `${fieldName}: לפי החוזה ${contractValue} ₪, בתלוש ${actual} ₪ — הפרש ${Math.abs(gap)} ₪`
        : gapDirection === 'missing_from_payslip'
          ? `${fieldName}: מוגדר בחוזה (${contractValue} ₪) אך לא מופיע בתלוש`
          : `${fieldName}: בתלוש ${actual} ₪, בחוזה ${contractValue} ₪`,
    })
  }
}

function buildOvertimeAnalysis(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  profile: ProfileData,
): OvertimeAnalysis {
  const overtimeResult = calculateOvertime({
    baseSalary: contract.baseSalary.value,
    commissions: payslip.commissionPay ?? 0,
    workDaysPerWeek: profile.workDaysPerWeek,
    totalHoursWorked: payslip.overtimeHours ? 182 + payslip.overtimeHours : 182,
    overtimeHours125: payslip.overtimeHours ? Math.min(payslip.overtimeHours, 44) : 0,
    overtimeHours150: payslip.overtimeHours ? Math.max(0, payslip.overtimeHours - 44) : 0,
    nightShiftHours: 0,
    shabbatHours: 0,
  })

  return {
    model: contract.overtimeModel.value,
    expectedPay: overtimeResult.totalOvertimePay,
    actualPay: payslip.overtimePay ?? 0,
    gap: Math.round(((overtimeResult.totalOvertimePay) - (payslip.overtimePay ?? 0)) * 100) / 100,
    effectiveHourlyRate: overtimeResult.effectiveHourlyRate,
  }
}

function buildTaxAnalysis(
  payslip: ParsedPayslip,
  profile: ProfileData,
  year: number,
): TaxAnalysis {
  const creditInput: CreditPointsInput = {
    gender: profile.gender,
    childrenBirthYears: profile.childrenBirthYears,
    academicDegree: profile.academicDegree,
    degreeCompletionYear: profile.degreeCompletionYear,
    militaryService: profile.militaryService,
    isNewImmigrant: profile.isNewImmigrant,
    immigrationDate: profile.immigrationDate,
    disabilityPercentage: profile.disabilityPercentage,
    isSingleParent: profile.isSingleParent,
    reservistDays2026: profile.reservistDays2026,
  }

  const taxBeforeCredits = calculateIncomeTax(payslip.grossSalary, year)
  const credits = calculateCreditPoints(creditInput, year)

  let regionalValue = 0
  if (profile.settlement) {
    const regional = calculateRegionalBenefit(profile.settlement, payslip.grossSalary, year)
    regionalValue = regional.totalBenefit
  }

  const expectedTax = Math.max(0, Math.round((taxBeforeCredits - credits.monthlyValue - regionalValue) * 100) / 100)
  const actualTax = payslip.incomeTax ?? 0
  const overcharge = Math.max(0, Math.round((actualTax - expectedTax) * 100) / 100)

  return {
    expectedTax,
    actualTax,
    overcharge,
    creditPoints: credits.totalPoints,
    creditPointsValue: credits.monthlyValue,
    regionalBenefitValue: regionalValue,
  }
}

function buildSummary(findings: AnalysisFinding[]): DiffSummary {
  const critical = findings.filter(f => f.severity === 'critical').length
  const warning = findings.filter(f => f.severity === 'warning').length
  const info = findings.filter(f => f.severity === 'info').length
  const totalGapAmount = findings
    .filter(f => f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip')
    .reduce((sum, f) => sum + f.gap, 0)

  return {
    totalFindings: findings.length,
    critical,
    warning,
    info,
    totalGapAmount: Math.round(totalGapAmount * 100) / 100,
  }
}
