import type { ContractTerms } from '../../types'

export function hasLowConfidence(terms: ContractTerms | null): boolean {
  if (!terms) return false
  return [
    terms.baseSalary,
    terms.payModel,
    terms.pensionEmployeePct,
    terms.pensionEmployerPct,
  ].some(f => f.needsVerification)
}
