import type { SectionCheck } from './context'
import { compareField } from './compareField'
import { downgradeForConfidence } from './confidenceGate'

export const checkBasePay: SectionCheck = (ctx) => {
  // Stage E10 — gate severity by extraction confidence on baseSalary.
  const { severity, note } = downgradeForConfidence(ctx.contract.baseSalary, 'critical')
  const finding = compareField(
    'base_pay', 'שכר בסיס',
    ctx.contract.baseSalary.value, ctx.payslip.basePay,
    severity, 'חוק הגנת השכר, סעיף 5',
    ctx.payslip.grossSalary,
  )
  if (!finding) return []
  if (note) finding.explanation += note
  return [finding]
}
