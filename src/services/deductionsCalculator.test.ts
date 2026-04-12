import { describe, it, expect } from 'vitest'
import {
  calculateNationalInsurance,
  calculateHealthInsurance,
  calculateEmployerNI,
  calculatePension,
  calculateKerenHistahlmut,
  calculateAllDeductions,
  DEFAULT_PENSION,
  DEFAULT_KEREN,
} from './deductionsCalculator'

describe('calculateNationalInsurance', () => {
  it('returns 0 for zero income', () => {
    expect(calculateNationalInsurance(0, 2026)).toBe(0)
  })

  it('calculates reduced rate for income below threshold (2026)', () => {
    // 7000 < 7122 threshold → all at 0.4%
    expect(calculateNationalInsurance(7000, 2026)).toBeCloseTo(28, 0)
  })

  it('calculates split rate for income above threshold (2026)', () => {
    // 15000: 7122 * 0.004 + (15000-7122) * 0.07
    const expected = 7122 * 0.004 + 7878 * 0.07
    expect(calculateNationalInsurance(15000, 2026)).toBeCloseTo(expected, 0)
  })

  it('uses 2022 threshold', () => {
    // 2022 threshold: 6331
    expect(calculateNationalInsurance(6331, 2022)).toBeCloseTo(6331 * 0.004, 0)
  })
})

describe('calculateHealthInsurance', () => {
  it('calculates reduced rate below threshold', () => {
    expect(calculateHealthInsurance(7000, 2026)).toBeCloseTo(7000 * 0.031, 0)
  })

  it('calculates split rate above threshold', () => {
    const expected = 7122 * 0.031 + (15000 - 7122) * 0.05
    expect(calculateHealthInsurance(15000, 2026)).toBeCloseTo(expected, 0)
  })
})

describe('calculateEmployerNI', () => {
  it('calculates employer contribution', () => {
    const expected = 7122 * 0.0345 + (15000 - 7122) * 0.0675
    expect(calculateEmployerNI(15000, 2026)).toBeCloseTo(expected, 0)
  })
})

describe('calculatePension', () => {
  it('calculates employee pension at 6%', () => {
    const result = calculatePension(10000)
    expect(result.employee).toBe(600)
  })

  it('calculates employer pension at 6.5%', () => {
    const result = calculatePension(10000)
    expect(result.employer).toBe(650)
  })

  it('calculates severance at 8.33%', () => {
    const result = calculatePension(10000)
    expect(result.severance).toBe(833)
  })

  it('uses custom rates', () => {
    const result = calculatePension(10000, {
      employeeRate: 0.07,
      employerRate: 0.075,
      severanceRate: 0.0833,
    })
    expect(result.employee).toBe(700)
    expect(result.employer).toBe(750)
  })
})

describe('calculateKerenHistahlmut', () => {
  it('calculates employee at 2.5%', () => {
    const result = calculateKerenHistahlmut(10000)
    expect(result.employee).toBe(250)
  })

  it('calculates employer at 7.5%', () => {
    const result = calculateKerenHistahlmut(10000)
    expect(result.employer).toBe(750)
  })
})

describe('calculateAllDeductions', () => {
  it('calculates complete deduction breakdown', () => {
    const result = calculateAllDeductions(15000, 2026, 15000)
    expect(result.nationalInsurance).toBeGreaterThan(0)
    expect(result.healthInsurance).toBeGreaterThan(0)
    expect(result.pensionEmployee).toBe(900) // 15000 * 0.06
    expect(result.pensionEmployer).toBe(975) // 15000 * 0.065
    expect(result.severanceEmployer).toBeCloseTo(1249.5, 0) // 15000 * 0.0833
    expect(result.kerenEmployee).toBe(375) // 15000 * 0.025
    expect(result.kerenEmployer).toBe(1125) // 15000 * 0.075
  })

  it('includes commissions in pension base', () => {
    // gross=10000, commissions=5000 → pensionBase=15000
    const result = calculateAllDeductions(10000, 2026, 15000)
    expect(result.pensionEmployee).toBe(900) // based on 15000, not 10000
  })

  it('works without keren hishtalmut', () => {
    const result = calculateAllDeductions(10000, 2026, 10000, DEFAULT_PENSION, null)
    expect(result.kerenEmployee).toBe(0)
    expect(result.kerenEmployer).toBe(0)
  })
})
