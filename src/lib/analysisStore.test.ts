import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analysisStore } from './analysisStore'
import type { ContractTerms, ParsedPayslip, DiffResult } from '../types'

function mockContract(): ContractTerms {
  return {} as ContractTerms
}
function mockPayslip(): ParsedPayslip {
  return { month: 1, year: 2026 } as ParsedPayslip
}
function mockResult(): DiffResult {
  return {
    findings: [],
    summary: { totalFindings: 0, critical: 0, warning: 0, info: 0, totalGapAmount: 0 },
    overtimeAnalysis: { model: 'standard', expectedPay: 0, actualPay: 0, gap: 0, effectiveHourlyRate: 55 },
    taxAnalysis: { expectedTax: 0, actualTax: 0, overcharge: 0, creditPoints: 0, creditPointsValue: 0, regionalBenefitValue: 0 },
  }
}

beforeEach(() => {
  analysisStore.reset()
})

describe('analysisStore', () => {
  it('starts with null state', () => {
    const s = analysisStore.getState()
    expect(s.contractTerms).toBeNull()
    expect(s.payslip).toBeNull()
    expect(s.result).toBeNull()
    expect(s.contractFileName).toBeNull()
    expect(s.payslipFileName).toBeNull()
  })

  it('setContract stores terms + filename', () => {
    analysisStore.setContract(mockContract(), 'contract.pdf')
    const s = analysisStore.getState()
    expect(s.contractTerms).not.toBeNull()
    expect(s.contractFileName).toBe('contract.pdf')
  })

  it('setPayslip stores payslip + filename without clobbering contract', () => {
    analysisStore.setContract(mockContract(), 'c.pdf')
    analysisStore.setPayslip(mockPayslip(), 'p.pdf')
    const s = analysisStore.getState()
    expect(s.contractFileName).toBe('c.pdf')
    expect(s.payslipFileName).toBe('p.pdf')
    expect(s.payslip?.year).toBe(2026)
  })

  it('setResult stores result', () => {
    analysisStore.setResult(mockResult())
    expect(analysisStore.getState().result).not.toBeNull()
  })

  it('reset clears all fields', () => {
    analysisStore.setContract(mockContract(), 'c.pdf')
    analysisStore.setPayslip(mockPayslip(), 'p.pdf')
    analysisStore.setResult(mockResult())
    analysisStore.reset()
    const s = analysisStore.getState()
    expect(s.contractTerms).toBeNull()
    expect(s.payslip).toBeNull()
    expect(s.result).toBeNull()
  })

  it('subscribe fires on every mutation', () => {
    const fn = vi.fn()
    const unsub = analysisStore.subscribe(fn)
    analysisStore.setContract(mockContract(), 'c.pdf')
    analysisStore.setPayslip(mockPayslip(), 'p.pdf')
    analysisStore.setResult(mockResult())
    analysisStore.reset()
    expect(fn).toHaveBeenCalledTimes(4)
    unsub()
  })

  it('subscribe returns unsubscribe function', () => {
    const fn = vi.fn()
    const unsub = analysisStore.subscribe(fn)
    analysisStore.setContract(mockContract(), 'c.pdf')
    unsub()
    analysisStore.setPayslip(mockPayslip(), 'p.pdf')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('getState returns new reference after mutation', () => {
    const before = analysisStore.getState()
    analysisStore.setContract(mockContract(), 'c.pdf')
    const after = analysisStore.getState()
    expect(after).not.toBe(before)
  })
})
