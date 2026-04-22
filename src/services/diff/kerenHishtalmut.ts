import type { SectionCheck } from './context'
import { compareField } from './compareField'

export const checkKerenHishtalmut: SectionCheck = (ctx) => {
  const pct = ctx.contract.kerenHishtalmutEmployeePct.value
  if (!pct) return []
  const finding = compareField(
    'keren_hishtalmut', 'קרן השתלמות עובד',
    ctx.contract.baseSalary.value * (pct / 100),
    ctx.payslip.kerenHishtalmutEmployee,
    'warning', 'צו הרחבה לקרן השתלמות',
  )
  return finding ? [finding] : []
}
