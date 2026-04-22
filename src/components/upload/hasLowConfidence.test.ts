import { describe, it, expect } from 'vitest'
import { hasLowConfidence } from './hasLowConfidence'
import type { ContractTerms } from '../../types'

function field(needsVerification: boolean) {
  return { value: 0, confidence: 1, needsVerification }
}

function contract(over: Partial<Record<'baseSalary'|'payModel'|'pensionEmployeePct'|'pensionEmployerPct', boolean>> = {}): ContractTerms {
  return {
    baseSalary: field(over.baseSalary ?? false),
    payModel: { value: 'monthly', confidence: 1, needsVerification: over.payModel ?? false },
    pensionEmployeePct: field(over.pensionEmployeePct ?? false),
    pensionEmployerPct: field(over.pensionEmployerPct ?? false),
  } as unknown as ContractTerms
}

describe('hasLowConfidence', () => {
  it('returns false when terms are null', () => {
    expect(hasLowConfidence(null)).toBe(false)
  })

  it('returns false when no flags set', () => {
    expect(hasLowConfidence(contract())).toBe(false)
  })

  it('returns true when baseSalary flagged', () => {
    expect(hasLowConfidence(contract({ baseSalary: true }))).toBe(true)
  })

  it('returns true when payModel flagged', () => {
    expect(hasLowConfidence(contract({ payModel: true }))).toBe(true)
  })

  it('returns true when either pension rate flagged', () => {
    expect(hasLowConfidence(contract({ pensionEmployeePct: true }))).toBe(true)
    expect(hasLowConfidence(contract({ pensionEmployerPct: true }))).toBe(true)
  })
})
