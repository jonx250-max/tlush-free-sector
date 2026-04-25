import { describe, it, expect } from 'vitest'
import { calculatePrice, isValidMonths, isValidTier, DEPTH_INFO, VOLUME_INFO } from './pricing'

describe('calculatePrice — full 12-cell matrix', () => {
  it('Basic × 1 = ₪8.00', () => {
    expect(calculatePrice('basic', 1).totalNis).toBe(8)
  })
  it('Basic × 3 = ₪21.60', () => {
    expect(calculatePrice('basic', 3).totalNis).toBe(21.6)
  })
  it('Basic × 6 = ₪39.84', () => {
    expect(calculatePrice('basic', 6).totalNis).toBe(39.84)
  })
  it('Basic × 12 = ₪72.00', () => {
    expect(calculatePrice('basic', 12).totalNis).toBe(72)
  })
  it('Pro × 1 = ₪10.00', () => {
    expect(calculatePrice('pro', 1).totalNis).toBe(10)
  })
  it('Pro × 3 = ₪27.00', () => {
    expect(calculatePrice('pro', 3).totalNis).toBe(27)
  })
  it('Pro × 6 = ₪49.80', () => {
    expect(calculatePrice('pro', 6).totalNis).toBe(49.8)
  })
  it('Pro × 12 = ₪90.00', () => {
    expect(calculatePrice('pro', 12).totalNis).toBe(90)
  })
  it('Premium × 1 = ₪14.00', () => {
    expect(calculatePrice('premium', 1).totalNis).toBe(14)
  })
  it('Premium × 3 = ₪37.80', () => {
    expect(calculatePrice('premium', 3).totalNis).toBe(37.8)
  })
  it('Premium × 6 = ₪69.72', () => {
    expect(calculatePrice('premium', 6).totalNis).toBe(69.72)
  })
  it('Premium × 12 = ₪126.00', () => {
    expect(calculatePrice('premium', 12).totalNis).toBe(126)
  })
})

describe('calculatePrice — free tier', () => {
  it('free always returns 0 cost', () => {
    expect(calculatePrice('free', 1).totalNis).toBe(0)
  })
})

describe('calculatePrice — discount math', () => {
  it('returns correct discountPct', () => {
    expect(calculatePrice('basic', 12).discountPct).toBe(25)
    expect(calculatePrice('basic', 6).discountPct).toBe(17)
    expect(calculatePrice('basic', 3).discountPct).toBe(10)
    expect(calculatePrice('basic', 1).discountPct).toBe(0)
  })
  it('returns per-unit after discount', () => {
    const p = calculatePrice('basic', 12)
    expect(p.perUnitAfterDiscountNis).toBe(6) // 72 / 12
  })
})

describe('isValidMonths', () => {
  it('accepts 1, 3, 6, 12', () => {
    expect(isValidMonths(1)).toBe(true)
    expect(isValidMonths(3)).toBe(true)
    expect(isValidMonths(6)).toBe(true)
    expect(isValidMonths(12)).toBe(true)
  })
  it('rejects other values', () => {
    expect(isValidMonths(2)).toBe(false)
    expect(isValidMonths(0)).toBe(false)
    expect(isValidMonths(13)).toBe(false)
    expect(isValidMonths(-1)).toBe(false)
  })
})

describe('isValidTier', () => {
  it('accepts known tiers', () => {
    expect(isValidTier('free')).toBe(true)
    expect(isValidTier('basic')).toBe(true)
    expect(isValidTier('pro')).toBe(true)
    expect(isValidTier('premium')).toBe(true)
  })
  it('rejects unknown', () => {
    expect(isValidTier('business')).toBe(false)
    expect(isValidTier('')).toBe(false)
  })
})

describe('DEPTH_INFO + VOLUME_INFO consistency', () => {
  it('all paid tiers have positive price', () => {
    for (const tier of ['basic', 'pro', 'premium'] as const) {
      expect(DEPTH_INFO[tier].pricePerUnitNis).toBeGreaterThan(0)
    }
  })
  it('discount monotonically grows with months', () => {
    expect(VOLUME_INFO[1].discountPct).toBeLessThanOrEqual(VOLUME_INFO[3].discountPct)
    expect(VOLUME_INFO[3].discountPct).toBeLessThanOrEqual(VOLUME_INFO[6].discountPct)
    expect(VOLUME_INFO[6].discountPct).toBeLessThanOrEqual(VOLUME_INFO[12].discountPct)
  })
})
