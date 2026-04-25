import { describe, it, expect } from 'vitest'
import { calculateMaternityBenefit } from './maternityBenefitCalculator'

describe('calculateMaternityBenefit', () => {
  it('rejects when insufficient insurance months', () => {
    const r = calculateMaternityBenefit({
      eventType: 'birth_mother', eventDate: '2026-04-01',
      monthsInsuredLast14: 5, monthsInsuredLast22: 8,
      avgGrossLast3Months: 12000,
    })
    expect(r.eligible).toBe(false)
    expect(r.totalBenefitNis).toBe(0)
  })

  it('grants 15 weeks for standard birth (mother)', () => {
    const r = calculateMaternityBenefit({
      eventType: 'birth_mother', eventDate: '2026-04-01',
      monthsInsuredLast14: 12, monthsInsuredLast22: 18,
      avgGrossLast3Months: 12000,
    })
    expect(r.eligible).toBe(true)
    expect(r.weeksEntitled).toBe(15)
    expect(r.daysEntitled).toBe(105)
  })

  it('extends for twins by 3 weeks', () => {
    const r = calculateMaternityBenefit({
      eventType: 'birth_mother', eventDate: '2026-04-01',
      monthsInsuredLast14: 12, monthsInsuredLast22: 18,
      avgGrossLast3Months: 10000, isMultipleBirth: true, childrenCount: 2,
    })
    expect(r.weeksEntitled).toBe(18)
  })

  it('applies daily cap when income exceeds NII max', () => {
    const r = calculateMaternityBenefit({
      eventType: 'birth_mother', eventDate: '2026-04-01',
      monthsInsuredLast14: 12, monthsInsuredLast22: 18,
      avgGrossLast3Months: 80000, // very high
    })
    expect(r.capApplied).toBe(true)
    expect(r.dailyBenefitNis).toBeLessThanOrEqual(1546)
  })

  it('partner gets 8 days', () => {
    const r = calculateMaternityBenefit({
      eventType: 'partner', eventDate: '2026-04-01',
      monthsInsuredLast14: 12, monthsInsuredLast22: 18,
      avgGrossLast3Months: 10000,
    })
    expect(r.daysEntitled).toBe(8)
  })

  it('adoption grants 12 weeks', () => {
    const r = calculateMaternityBenefit({
      eventType: 'adoption', eventDate: '2026-04-01',
      monthsInsuredLast14: 12, monthsInsuredLast22: 18,
      avgGrossLast3Months: 10000,
    })
    expect(r.weeksEntitled).toBe(12)
  })
})
