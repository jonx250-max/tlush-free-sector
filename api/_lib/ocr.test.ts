import { describe, it, expect } from 'vitest'
import { validateSums, type PayslipStructured } from './ocr'

describe('validateSums', () => {
  it('accepts when net + deductions ≈ gross within 5%', () => {
    const s: PayslipStructured = { grossSalary: 10000, netSalary: 7500, totalDeductions: 2500 }
    expect(validateSums(s).valid).toBe(true)
  })

  it('accepts small rounding diff', () => {
    const s: PayslipStructured = { grossSalary: 10000, netSalary: 7501, totalDeductions: 2500 }
    expect(validateSums(s).valid).toBe(true)
  })

  it('rejects when delta > 5%', () => {
    const s: PayslipStructured = { grossSalary: 10000, netSalary: 5000, totalDeductions: 2500 }
    const r = validateSums(s)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('net-sum-mismatch')
  })

  it('rejects when required sums missing', () => {
    const s: PayslipStructured = { grossSalary: 10000 }
    const r = validateSums(s)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('missing-required-sums')
  })

  it('handles boundary at exactly 5% tolerance', () => {
    const s: PayslipStructured = { grossSalary: 10000, netSalary: 7000, totalDeductions: 2500 }
    // delta = |10000-2500-7000| = 500 = 5% exactly
    expect(validateSums(s).valid).toBe(true)
  })
})
