import { describe, it, expect } from 'vitest'
import { calculateSeverance } from './severanceCalculator'

describe('calculateSeverance', () => {
  it('returns zero when dates missing', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 10000, startDate: null, terminationDate: null,
      pensionSeveranceAccrued: 0, isTerminatedByEmployer: true,
    })
    expect(r.expectedSeverance).toBe(0)
    expect(r.isEligible).toBe(false)
  })

  it('not eligible if quit (not terminated by employer)', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 10000, startDate: '2020-01-01', terminationDate: '2026-01-01',
      pensionSeveranceAccrued: 0, isTerminatedByEmployer: false,
    })
    expect(r.isEligible).toBe(false)
  })

  it('not eligible under 1 year', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 10000, startDate: '2025-06-01', terminationDate: '2026-01-01',
      pensionSeveranceAccrued: 0, isTerminatedByEmployer: true,
    })
    expect(r.isEligible).toBe(false)
  })

  it('calculates 6 years × 10000 = 60000 expected, full shortfall when nothing accrued', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 10000, startDate: '2020-01-01', terminationDate: '2026-01-01',
      pensionSeveranceAccrued: 0, isTerminatedByEmployer: true,
    })
    expect(r.yearsOfService).toBe(6)
    expect(r.expectedSeverance).toBe(60000)
    expect(r.shortfall).toBe(60000)
    expect(r.isEligible).toBe(true)
  })

  it('reduces shortfall by accrued pension severance component', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 10000, startDate: '2020-01-01', terminationDate: '2026-01-01',
      pensionSeveranceAccrued: 50000, isTerminatedByEmployer: true,
    })
    expect(r.shortfall).toBe(10000)
  })

  it('computes form 161 taxable above tax-free ceiling', () => {
    const r = calculateSeverance({
      lastMonthlyGross: 30000, startDate: '2020-01-01', terminationDate: '2026-01-01',
      pensionSeveranceAccrued: 0, isTerminatedByEmployer: true,
    })
    // 6 × 30000 = 180000; ceiling 6 × 13750 = 82500; taxable = 97500
    expect(r.form161TaxFreeCeiling).toBe(82500)
    expect(r.form161Taxable).toBe(97500)
  })
})
