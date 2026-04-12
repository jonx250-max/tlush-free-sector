import { describe, it, expect } from 'vitest'
import { analyzeCommissions, detectFictitiousBonus } from './commissionCalculator'

describe('analyzeCommissions', () => {
  it('returns clean result when no commissions', () => {
    const result = analyzeCommissions(10000, 0, 600, 0.06)
    expect(result.isIncludedInPensionBase).toBe(true)
    expect(result.pensionShortfall).toBe(0)
  })

  it('detects commission excluded from pension base', () => {
    // base=10000, commission=5000, pension deducted=600 (6% of 10000 only)
    const result = analyzeCommissions(10000, 5000, 600, 0.06)
    expect(result.isIncludedInPensionBase).toBe(false)
    // Expected pension: 15000 * 0.06 = 900, shortfall = 300
    expect(result.pensionShortfall).toBeCloseTo(300, 0)
  })

  it('confirms commission included when pension matches full base', () => {
    // base=10000, commission=5000, pension=900 (6% of 15000)
    const result = analyzeCommissions(10000, 5000, 900, 0.06)
    expect(result.isIncludedInPensionBase).toBe(true)
    expect(result.pensionShortfall).toBe(0)
  })

  it('calculates effective base for overtime', () => {
    const result = analyzeCommissions(10000, 5000, 600, 0.06)
    expect(result.effectiveBaseForOvertime).toBe(15000)
  })
})

describe('detectFictitiousBonus', () => {
  it('detects same amount 3+ months', () => {
    const result = detectFictitiousBonus([2000, 2000, 2000, 2000])
    expect(result.isFictitious).toBe(true)
    expect(result.amount).toBe(2000)
    expect(result.consecutiveMonths).toBe(4)
  })

  it('does not flag varying amounts', () => {
    const result = detectFictitiousBonus([2000, 1500, 3000, 2000])
    expect(result.isFictitious).toBe(false)
  })

  it('does not flag less than 3 months', () => {
    const result = detectFictitiousBonus([2000, 2000])
    expect(result.isFictitious).toBe(false)
  })

  it('does not flag zero amounts', () => {
    const result = detectFictitiousBonus([0, 0, 0, 0])
    expect(result.isFictitious).toBe(false)
  })

  it('detects within longer series', () => {
    const result = detectFictitiousBonus([1000, 2000, 2000, 2000, 1500])
    expect(result.isFictitious).toBe(true)
    expect(result.amount).toBe(2000)
  })
})
