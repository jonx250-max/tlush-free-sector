import { describe, it, expect } from 'vitest'
import {
  getRecuperationDays,
  calculateAnnualRecuperation,
  calculateMonthlyRecuperation,
} from './recuperationCalculator'

describe('getRecuperationDays', () => {
  it('returns 5 for first year', () => {
    expect(getRecuperationDays(1)).toBe(5)
  })

  it('returns 7 for 5-year employee', () => {
    expect(getRecuperationDays(5)).toBe(7)
  })

  it('returns 10 for 20+ year employee', () => {
    expect(getRecuperationDays(20)).toBe(10)
    expect(getRecuperationDays(25)).toBe(10)
  })
})

describe('calculateAnnualRecuperation', () => {
  it('calculates first year 2026', () => {
    // 5 days * 440 = 2200
    expect(calculateAnnualRecuperation(1, 2026)).toBe(2200)
  })

  it('calculates 5-year 2025', () => {
    // 7 days * 431 = 3017
    expect(calculateAnnualRecuperation(5, 2025)).toBe(3017)
  })
})

describe('calculateMonthlyRecuperation', () => {
  it('divides annual by 12', () => {
    const monthly = calculateMonthlyRecuperation(1, 2026)
    expect(monthly).toBeCloseTo(2200 / 12, 0)
  })
})
