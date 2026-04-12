import { describe, it, expect } from 'vitest'
import {
  calculateOvertime,
  calculateEffectiveHourlyRate,
  getStandardMonthlyHours,
  validateGlobalOvertime,
} from './overtimeCalculator'

describe('getStandardMonthlyHours', () => {
  it('returns 182 for 5-day week', () => {
    expect(getStandardMonthlyHours(5)).toBe(182)
  })

  it('returns 186 for 6-day week', () => {
    expect(getStandardMonthlyHours(6)).toBe(186)
  })
})

describe('calculateEffectiveHourlyRate', () => {
  it('includes commissions in base', () => {
    // (10000 + 5000) / 186 ≈ 80.65
    const rate = calculateEffectiveHourlyRate(10000, 5000, 6)
    expect(rate).toBeCloseTo(80.65, 1)
  })

  it('calculates for 5-day week', () => {
    // 15000 / 182 ≈ 82.42
    const rate = calculateEffectiveHourlyRate(15000, 0, 5)
    expect(rate).toBeCloseTo(82.42, 1)
  })
})

describe('calculateOvertime', () => {
  it('calculates 125% overtime correctly', () => {
    const result = calculateOvertime({
      baseSalary: 10000,
      commissions: 0,
      workDaysPerWeek: 5,
      totalHoursWorked: 200,
      overtimeHours125: 10,
      overtimeHours150: 0,
      nightShiftHours: 0,
      shabbatHours: 0,
    })

    const hourly = 10000 / 182
    expect(result.overtime125Pay).toBeCloseTo(10 * hourly * 1.25, 0)
  })

  it('calculates 150% overtime correctly', () => {
    const result = calculateOvertime({
      baseSalary: 10000,
      commissions: 0,
      workDaysPerWeek: 5,
      totalHoursWorked: 210,
      overtimeHours125: 0,
      overtimeHours150: 10,
      nightShiftHours: 0,
      shabbatHours: 0,
    })

    const hourly = 10000 / 182
    expect(result.overtime150Pay).toBeCloseTo(10 * hourly * 1.50, 0)
  })

  it('includes commissions in hourly rate for overtime', () => {
    const result = calculateOvertime({
      baseSalary: 10000,
      commissions: 5000,
      workDaysPerWeek: 6,
      totalHoursWorked: 200,
      overtimeHours125: 10,
      overtimeHours150: 4,
      nightShiftHours: 0,
      shabbatHours: 0,
    })

    // effective hourly = 15000 / 186 ≈ 80.65
    expect(result.effectiveHourlyRate).toBeCloseTo(80.65, 1)
    expect(result.totalOvertimePay).toBeGreaterThan(0)
  })

  it('calculates night shift adjustment', () => {
    const result = calculateOvertime({
      baseSalary: 10000,
      commissions: 0,
      workDaysPerWeek: 5,
      totalHoursWorked: 182,
      overtimeHours125: 0,
      overtimeHours150: 0,
      nightShiftHours: 10,
      shabbatHours: 0,
    })

    const hourly = 10000 / 182
    expect(result.nightShiftAdjustment).toBeCloseTo(10 * hourly * 0.25, 0)
  })

  it('calculates shabbat pay at 150%', () => {
    const result = calculateOvertime({
      baseSalary: 10000,
      commissions: 0,
      workDaysPerWeek: 5,
      totalHoursWorked: 190,
      overtimeHours125: 0,
      overtimeHours150: 0,
      nightShiftHours: 0,
      shabbatHours: 8,
    })

    const hourly = 10000 / 182
    expect(result.shabbatPay).toBeCloseTo(8 * hourly * 1.50, 0)
  })
})

describe('validateGlobalOvertime', () => {
  it('detects insufficient global overtime amount', () => {
    const result = validateGlobalOvertime(
      30,   // 30 global OT hours
      2000, // employer pays 2000 for them
      10000, 0, 5,
    )

    // hourly = 10000/182 ≈ 54.95
    // 30h * 54.95 * 1.25 = 2060.44 minimum
    expect(result.minimumOvertimePay).toBeGreaterThan(2000)
    expect(result.isAmountSufficient).toBe(false)
    expect(result.shortfall).toBeGreaterThan(0)
  })

  it('passes when amount is sufficient', () => {
    const result = validateGlobalOvertime(
      20, 5000, 10000, 0, 5,
    )

    expect(result.isAmountSufficient).toBe(true)
    expect(result.shortfall).toBe(0)
  })
})
