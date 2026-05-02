/**
 * Stage B B2 — property-based math tests with fast-check.
 *
 * Targets: tax bracket math, overtime hourly-rate, severance accrual,
 * round2 idempotence. Each property runs 100 random samples by default.
 *
 * Stage E (E6) replaces IEEE-754 floats with Decimal/Money. These
 * properties should keep passing through that refactor.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateIncomeTax } from '../taxCalculator'
import {
  calculateEffectiveHourlyRate,
  getStandardMonthlyHours,
  validateGlobalOvertime,
} from '../overtimeCalculator'
import { round2, percent, clamp } from '../../lib/numbers'

const SUPPORTED_YEARS = [2022, 2023, 2024, 2025, 2026]

describe('B2 — round2 properties', () => {
  it('idempotent: round2(round2(x)) === round2(x)', () => {
    fc.assert(fc.property(
      fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true }),
      x => Object.is(round2(round2(x)), round2(x)),
    ))
  })

  it('error bound: |round2(x) - x| <= 0.005 + IEEE epsilon', () => {
    fc.assert(fc.property(
      fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
      x => Math.abs(round2(x) - x) <= 0.005 + 1e-9,
    ))
  })

  it('preserves sign on non-zero input', () => {
    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 1e6, noNaN: true, noDefaultInfinity: true }),
      x => round2(x) >= 0 && round2(-x) <= 0,
    ))
  })
})

describe('B2 — clamp + percent', () => {
  it('clamp output stays within [lo, hi]', () => {
    fc.assert(fc.property(
      fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 1e3, noNaN: true, noDefaultInfinity: true }),
      (x, lo, span) => {
        const hi = lo + span
        const result = clamp(x, lo, hi)
        return result >= lo && result <= hi
      },
    ))
  })

  it('percent: zero denominator returns 0', () => {
    fc.assert(fc.property(
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      n => percent(n, 0) === 0,
    ))
  })

  it('percent: percent(x, x) === 100 for non-zero x', () => {
    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 1e6, noNaN: true, noDefaultInfinity: true }),
      x => percent(x, x) === 100,
    ))
  })
})

describe('B2 — calculateIncomeTax properties', () => {
  it('tax(0) === 0 across every supported year', () => {
    for (const year of SUPPORTED_YEARS) {
      expect(calculateIncomeTax(0, year)).toBe(0)
    }
  })

  it('tax(x) >= 0 — never negative', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 200_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(...SUPPORTED_YEARS),
      (gross, year) => calculateIncomeTax(gross, year) >= 0,
    ))
  })

  it('tax(x) <= x — tax never exceeds gross income', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 200_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(...SUPPORTED_YEARS),
      (gross, year) => calculateIncomeTax(gross, year) <= gross + 1e-6,
    ))
  })

  it('monotonic: a < b implies tax(a) <= tax(b)', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(...SUPPORTED_YEARS),
      (a, b, year) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a]
        return calculateIncomeTax(lo, year) <= calculateIncomeTax(hi, year) + 1e-6
      },
    ))
  })

  it('marginal rate cap: incremental tax never exceeds top-bracket rate (50%)', () => {
    // Top bracket in every supported year is 50%. Because calculateIncomeTax
    // rounds to 0.01 internally, a difference of two rounded values can drift
    // up to 0.01 from the true marginal. Allow that absolute tolerance.
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0.01, max: 10_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(...SUPPORTED_YEARS),
      (base, delta, year) => {
        const incremental = calculateIncomeTax(base + delta, year) - calculateIncomeTax(base, year)
        return incremental <= delta * 0.50 + 0.01
      },
    ))
  })
})

describe('B2 — overtime properties', () => {
  it('standard monthly hours always positive integer-ish', () => {
    expect(getStandardMonthlyHours(5)).toBeGreaterThan(0)
    expect(getStandardMonthlyHours(6)).toBeGreaterThan(0)
    expect(getStandardMonthlyHours(6)).toBeGreaterThan(getStandardMonthlyHours(5))
  })

  it('hourly rate proportional to (base + commission)', () => {
    fc.assert(fc.property(
      fc.double({ min: 1_000, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom<5 | 6>(5, 6),
      (base, commission, days) => {
        const rate = calculateEffectiveHourlyRate(base, commission, days)
        const hours = getStandardMonthlyHours(days)
        return Math.abs(rate - (base + commission) / hours) < 1e-6
      },
    ))
  })

  it('global OT shortfall is non-negative', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 80 }),
      fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 5_000, max: 50_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom<5 | 6>(5, 6),
      (hours, contractAmount, base, days) => {
        const result = validateGlobalOvertime(hours, contractAmount, base, 0, days)
        return result.shortfall >= 0
      },
    ))
  })

  it('global OT minimum cost rises with hours', () => {
    fc.assert(fc.property(
      fc.double({ min: 5_000, max: 50_000, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom<5 | 6>(5, 6),
      (base, days) => {
        const a = validateGlobalOvertime(10, 0, base, 0, days).minimumOvertimePay
        const b = validateGlobalOvertime(20, 0, base, 0, days).minimumOvertimePay
        const c = validateGlobalOvertime(40, 0, base, 0, days).minimumOvertimePay
        return a <= b + 1e-6 && b <= c + 1e-6
      },
    ))
  })
})
