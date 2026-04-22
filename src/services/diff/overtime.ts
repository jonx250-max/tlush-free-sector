import type { SectionCheck } from './context'
import { validateGlobalOvertime } from '../overtimeCalculator'

export const checkOvertime: SectionCheck = (ctx) => {
  const { contract, payslip, profile } = ctx
  if (contract.overtimeModel.value !== 'global' || !contract.globalOvertimeHours.value) return []

  const result = validateGlobalOvertime(
    contract.globalOvertimeHours.value,
    contract.globalOvertimeAmount.value ?? 0,
    contract.baseSalary.value,
    payslip.commissionPay ?? 0,
    profile.workDaysPerWeek,
  )
  if (result.isAmountSufficient) return []
  return [{
    category: 'global_overtime',
    fieldName: 'שעות נוספות גלובליות — סכום לא מספיק',
    contractValue: result.minimumOvertimePay,
    payslipValue: contract.globalOvertimeAmount.value ?? 0,
    gap: result.shortfall,
    gapDirection: 'underpaid',
    severity: 'warning',
    legalReference: 'חוק שעות עבודה ומנוחה — סעיף 16',
    explanation: `סכום השעות הנוספות הגלובליות (${contract.globalOvertimeAmount.value} ₪) נמוך מהמינימום החוקי (${result.minimumOvertimePay} ₪)`,
  }]
}
