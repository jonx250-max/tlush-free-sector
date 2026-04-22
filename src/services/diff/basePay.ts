import type { SectionCheck } from './context'
import { compareField } from './compareField'

export const checkBasePay: SectionCheck = (ctx) => {
  const finding = compareField(
    'base_pay', 'שכר בסיס',
    ctx.contract.baseSalary.value, ctx.payslip.basePay,
    'critical', 'חוק הגנת השכר, סעיף 5',
  )
  return finding ? [finding] : []
}
