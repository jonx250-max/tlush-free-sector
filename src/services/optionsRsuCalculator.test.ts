import { describe, it, expect } from 'vitest'
import { calculateOptionsVesting, calculateRsuVesting } from './optionsRsuCalculator'

describe('calculateOptionsVesting', () => {
  it('zero vested before cliff', () => {
    const r = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2026-01-01', shares: 1000, strikePrice: 10,
        vestingMonths: 48, cliffMonths: 12, track: 'capital',
      }],
      20,
      '2026-06-01' // 5 months elapsed
    )
    expect(r.vestedShares).toBe(0)
  })

  it('linear vesting after cliff', () => {
    const r = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2024-01-01', shares: 4800, strikePrice: 10,
        vestingMonths: 48, cliffMonths: 12, track: 'capital',
      }],
      20,
      '2026-01-01' // 24 months → 50% vested
    )
    expect(r.vestedShares).toBeGreaterThanOrEqual(2300)
    expect(r.vestedShares).toBeLessThanOrEqual(2500)
  })

  it('full vesting after vesting period', () => {
    const r = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2020-01-01', shares: 1000, strikePrice: 10,
        vestingMonths: 48, cliffMonths: 12, track: 'capital',
      }],
      30,
      '2026-04-01'
    )
    expect(r.vestedShares).toBe(1000)
    expect(r.intrinsicValueNis).toBe(20000) // (30-10) * 1000
    expect(r.expectedTaxNis).toBe(5000) // 25% capital track
  })

  it('zero intrinsic when underwater (price < strike)', () => {
    const r = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2020-01-01', shares: 1000, strikePrice: 50,
        vestingMonths: 48, cliffMonths: 12, track: 'capital',
      }],
      30, // underwater
      '2026-04-01'
    )
    expect(r.intrinsicValueNis).toBe(0)
    expect(r.expectedTaxNis).toBe(0)
  })

  it('income track taxed at higher rate', () => {
    const capital = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2020-01-01', shares: 1000, strikePrice: 10,
        vestingMonths: 48, cliffMonths: 12, track: 'capital',
      }],
      30, '2026-04-01'
    )
    const income = calculateOptionsVesting(
      [{
        grantId: 'g1', grantDate: '2020-01-01', shares: 1000, strikePrice: 10,
        vestingMonths: 48, cliffMonths: 12, track: 'income',
      }],
      30, '2026-04-01'
    )
    expect(income.expectedTaxNis).toBeGreaterThan(capital.expectedTaxNis)
  })
})

describe('calculateRsuVesting', () => {
  it('RSUs treated as zero strike', () => {
    const r = calculateRsuVesting(
      [{ grantId: 'r1', grantDate: '2020-01-01', units: 100, vestingMonths: 48, cliffMonths: 12, track: 'capital' }],
      30, '2026-04-01'
    )
    expect(r.intrinsicValueNis).toBe(3000) // 100 units × 30 ₪
  })
})
