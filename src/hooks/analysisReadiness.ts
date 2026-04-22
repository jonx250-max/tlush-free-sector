import type { ContractTerms, ParsedPayslip } from '../types'

export interface ReadinessInput {
  contractTerms: ContractTerms | null
  payslip: ParsedPayslip | null
}

export function validateReadyForAnalysis(state: ReadinessInput): string | null {
  if (!state.contractTerms || !state.payslip) {
    return 'חסרים נתוני חוזה או תלוש'
  }
  return null
}

export function extractErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback
}
