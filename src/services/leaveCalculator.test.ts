import { describe, it, expect } from 'vitest'
import {
  calculateVacationDays,
  calculateAccumulatedSickDays,
  calculateSickPay,
} from './leaveCalculator'

describe('calculateVacationDays', () => {
  it('returns 12 for 3-year employee (5-day)', () => {
    expect(calculateVacationDays(3, 5)).toBe(12)
  })

  it('returns 16 for 5-year employee (5-day)', () => {
    expect(calculateVacationDays(5, 5)).toBe(16)
  })

  it('returns 28 for 14+ year employee (5-day)', () => {
    expect(calculateVacationDays(14, 5)).toBe(28)
    expect(calculateVacationDays(20, 5)).toBe(28)
  })

  it('returns 14 for 1-year employee (6-day)', () => {
    expect(calculateVacationDays(1, 6)).toBe(14)
  })

  it('returns 24 for 7-year employee (6-day)', () => {
    expect(calculateVacationDays(7, 6)).toBe(24)
  })
})

describe('calculateAccumulatedSickDays', () => {
  it('calculates 1.5 per month', () => {
    expect(calculateAccumulatedSickDays(12)).toBe(18)
  })

  it('caps at 90', () => {
    expect(calculateAccumulatedSickDays(100)).toBe(90)
  })
})

describe('calculateSickPay', () => {
  it('pays 0 for day 1', () => {
    expect(calculateSickPay(500, 1)).toBe(0)
  })

  it('pays 50% for days 2-3', () => {
    // Day 1: 0, Day 2: 250, Day 3: 250 = 500
    expect(calculateSickPay(500, 3)).toBe(500)
  })

  it('pays 100% from day 4', () => {
    // Day 1: 0, Day 2: 250, Day 3: 250, Day 4: 500 = 1000
    expect(calculateSickPay(500, 4)).toBe(1000)
  })
})
