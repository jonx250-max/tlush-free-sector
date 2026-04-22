import type { SectionCheck } from './context'
import { validateMinimumWage } from '../minimumWageValidator'

export const checkMinimumWage: SectionCheck = (ctx) => {
  const result = validateMinimumWage(ctx.payslip.grossSalary, ctx.year, ctx.profile.workDaysPerWeek)
  if (result.isAboveMinimum) return []
  return [{
    category: 'minimum_wage',
    fieldName: 'שכר מינימום',
    contractValue: result.minimumWage,
    payslipValue: ctx.payslip.grossSalary,
    gap: result.shortfall,
    gapDirection: 'underpaid',
    severity: 'critical',
    legalReference: 'חוק שכר מינימום, התשמ"ז-1987',
    explanation: `שכר ברוטו (${ctx.payslip.grossSalary} ₪) נמוך משכר המינימום (${result.minimumWage} ₪)`,
  }]
}
