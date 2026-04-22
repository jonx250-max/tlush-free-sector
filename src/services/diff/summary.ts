import type { AnalysisFinding, DiffSummary } from '../../types'
import { round2 } from '../../lib/numbers'

export function buildSummary(findings: AnalysisFinding[]): DiffSummary {
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
