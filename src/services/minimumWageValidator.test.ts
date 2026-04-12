import { describe, it, expect } from 'vitest'
import { validateMinimumWage, validateHourlyMinimum } from './minimumWageValidator'

describe('validateMinimumWage', () => {
  it('passes when salary above minimum (2026)', () => {
    const result = validateMinimumWage(10000, 2026)
    expect(result.isAboveMinimum).toBe(true)
    expect(result.shortfall).toBe(0)
  })

  it('flags salary below minimum (2026)', () => {
    const result = validateMinimumWage(5500, 2026)
    expect(result.isAboveMinimum).toBe(false)
    expect(result.shortfall).toBe(500) // 6000 - 5500
    expect(result.minimumWage).toBe(6000)
  })

  it('exactly at minimum passes', () => {
    const result = validateMinimumWage(6000, 2026)
    expect(result.isAboveMinimum).toBe(true)
  })

  it('uses correct year data for 2022', () => {
    const result = validateMinimumWage(5300, 2022)
    expect(result.isAboveMinimum).toBe(true)
    expect(result.minimumWage).toBe(5300)
  })
})

describe('validateHourlyMinimum', () => {
  it('passes when hourly above minimum', () => {
    const result = validateHourlyMinimum(40, 2026)
    expect(result.isAboveMinimum).toBe(true)
  })

  it('flags hourly below minimum', () => {
    const result = validateHourlyMinimum(30, 2026)
    expect(result.isAboveMinimum).toBe(false)
    expect(result.shortfall).toBeCloseTo(2.96, 1) // 32.96 - 30
  })
})
