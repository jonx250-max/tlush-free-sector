import type { ContractTerms, ParsedPayslip, AnalysisFinding, TaxAnalysis } from '../../types'
import type { ProfileData } from '../diffEngine'
import { round2 } from '../../lib/numbers'

export interface SectionContext {
  contract: ContractTerms
  payslip: ParsedPayslip
  profile: ProfileData
  year: number
}

export type SectionCheck = (ctx: SectionContext) => AnalysisFinding[]
export type TaxSectionCheck = (ctx: SectionContext, analysis: TaxAnalysis) => AnalysisFinding[]

/**
 * Stage E5 — salary-proportional tolerance.
 *
 * Old behavior: flat 50 ₪ across all incomes. Punishing for high earners
 * (50 ₪ on 50k = 0.1%, way below noise) and lax for minimum wage
 * (50 ₪ on 5.8k = 0.8%, lets real shortfalls slip).
 *
 * New: max(10, round2(gross * 0.003)). 0.3% baseline + 10 ₪ floor so
 * the tiniest payslips still get a sensible cushion against rounding.
 *
 * Legacy export `TOLERANCE` retained as an explicit constant for places
 * (overtime threshold checks etc.) that genuinely want a fixed value.
 */
export const FLAT_TOLERANCE_LEGACY = 50

export function toleranceFor(grossSalaryNis: number | null | undefined): number {
  if (!grossSalaryNis || grossSalaryNis <= 0) return FLAT_TOLERANCE_LEGACY
  return Math.max(10, round2(grossSalaryNis * 0.003))
}
