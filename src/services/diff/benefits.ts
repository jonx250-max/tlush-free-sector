import type { SectionCheck } from './context'
import { compareField } from './compareField'

export const checkBenefits: SectionCheck = (ctx) => {
  const { contract, payslip } = ctx
  const findings = [
    compareField('travel', 'החזר נסיעות', contract.travelAllowance.value, payslip.travelAllowance, 'info', 'צו הרחבה — החזר נסיעות'),
    compareField('meals', 'דמי כלכלה', contract.mealAllowance.value, payslip.mealAllowance, 'info'),
    compareField('phone', 'החזר טלפון', contract.phoneAllowance.value, payslip.phoneAllowance, 'info'),
  ]
  return findings.filter((f): f is NonNullable<typeof f> => f !== null)
}
