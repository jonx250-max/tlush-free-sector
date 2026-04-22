import { describe, it, expect } from 'vitest'
import { validateReadyForAnalysis, extractErrorMessage } from './analysisReadiness'
import type { ContractTerms, ParsedPayslip } from '../types'

describe('validateReadyForAnalysis', () => {
  it('returns error when contract missing', () => {
    expect(validateReadyForAnalysis({ contractTerms: null, payslip: {} as ParsedPayslip }))
      .toBe('חסרים נתוני חוזה או תלוש')
  })

  it('returns error when payslip missing', () => {
    expect(validateReadyForAnalysis({ contractTerms: {} as ContractTerms, payslip: null }))
      .toBe('חסרים נתוני חוזה או תלוש')
  })

  it('returns error when both missing', () => {
    expect(validateReadyForAnalysis({ contractTerms: null, payslip: null }))
      .toBe('חסרים נתוני חוזה או תלוש')
  })

  it('returns null when both present', () => {
    expect(validateReadyForAnalysis({
      contractTerms: {} as ContractTerms,
      payslip: {} as ParsedPayslip,
    })).toBeNull()
  })
})

describe('extractErrorMessage', () => {
  it('unwraps Error instance', () => {
    expect(extractErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('uses fallback for non-Error values', () => {
    expect(extractErrorMessage('string', 'fallback')).toBe('fallback')
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback')
    expect(extractErrorMessage(42, 'fallback')).toBe('fallback')
  })
})
