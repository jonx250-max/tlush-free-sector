// ============================================================
// Analysis Store — manages state across upload → results flow
// Simple module-level store (no external state library needed)
// ============================================================

import type { ContractTerms, ParsedPayslip, DiffResult } from '../types'

interface AnalysisState {
  contractTerms: ContractTerms | null
  payslip: ParsedPayslip | null
  result: DiffResult | null
  contractFileName: string | null
  payslipFileName: string | null
}

let state: AnalysisState = {
  contractTerms: null,
  payslip: null,
  result: null,
  contractFileName: null,
  payslipFileName: null,
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export const analysisStore = {
  getState: () => state,

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  setContract(terms: ContractTerms, fileName: string) {
    state = { ...state, contractTerms: terms, contractFileName: fileName }
    notify()
  },

  setPayslip(payslip: ParsedPayslip, fileName: string) {
    state = { ...state, payslip, payslipFileName: fileName }
    notify()
  },

  setResult(result: DiffResult) {
    state = { ...state, result }
    notify()
  },

  reset() {
    state = {
      contractTerms: null,
      payslip: null,
      result: null,
      contractFileName: null,
      payslipFileName: null,
    }
    notify()
  },
}
