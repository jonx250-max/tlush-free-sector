import type { AnalysisFinding, FindingCategory, Severity, GapDirection } from '../../types'
import { round2 } from '../../lib/numbers'
import { TOLERANCE } from './context'

export function compareField(
  category: FindingCategory,
  fieldName: string,
  contractValue: number | null,
  payslipValue: number | null,
  severity: Severity,
  legalReference?: string,
): AnalysisFinding | null {
  if (contractValue === null || contractValue === undefined) return null

  const actual = payslipValue ?? 0
  const gap = round2(contractValue - actual)

  const gapDirection: GapDirection = Math.abs(gap) < TOLERANCE
    ? 'match'
    : payslipValue === null ? 'missing_from_payslip'
    : gap > 0 ? 'underpaid' : 'overpaid'

  if (gapDirection === 'match') return null

  return {
    category, fieldName, contractValue, payslipValue: actual,
    gap: Math.abs(gap), gapDirection, severity,
    legalReference: legalReference ?? null,
    explanation: buildExplanation(fieldName, contractValue, actual, gap, gapDirection),
  }
}

function buildExplanation(
  fieldName: string, contractValue: number, actual: number,
  gap: number, direction: GapDirection,
): string {
  if (direction === 'underpaid') {
    return `${fieldName}: לפי החוזה ${contractValue} ₪, בתלוש ${actual} ₪ — הפרש ${Math.abs(gap)} ₪`
  }
  if (direction === 'missing_from_payslip') {
    return `${fieldName}: מוגדר בחוזה (${contractValue} ₪) אך לא מופיע בתלוש`
  }
  return `${fieldName}: בתלוש ${actual} ₪, בחוזה ${contractValue} ₪`
}
