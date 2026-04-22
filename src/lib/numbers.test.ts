import { describe, it, expect } from 'vitest'
import { round2, round0, clamp, percent, zero } from './numbers'

describe('numbers', () => {
  describe('round2', () => {
    it('rounds to 2 decimals', () => {
      expect(round2(1.234)).toBe(1.23)
      expect(round2(1.235)).toBe(1.24)
      expect(round2(1)).toBe(1)
      expect(round2(0)).toBe(0)
    })

    it('handles negatives (matches legacy FP semantics)', () => {
      expect(round2(-1.23)).toBe(-1.23)
      expect(round2(-0.5)).toBe(-0.5)
    })

    it('matches legacy Math.round(n*100)/100 behavior', () => {
      const samples = [0.1, 0.2, 0.3, 1.005, 100.499, -50.505]
      for (const s of samples) {
        expect(round2(s)).toBe(Math.round(s * 100) / 100)
      }
    })
  })

  describe('round0', () => {
    it('rounds to integer', () => {
      expect(round0(1.4)).toBe(1)
      expect(round0(1.5)).toBe(2)
      expect(round0(-1.5)).toBe(-1)
    })
  })

  describe('clamp', () => {
    it('clamps within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('percent', () => {
    it('computes percentage rounded to 2 decimals', () => {
      expect(percent(50, 200)).toBe(25)
      expect(percent(1, 3)).toBe(33.33)
    })

    it('returns 0 when denominator is 0', () => {
      expect(percent(100, 0)).toBe(0)
    })
  })

  describe('zero', () => {
    it('returns 0', () => {
      expect(zero()).toBe(0)
    })
  })
})
