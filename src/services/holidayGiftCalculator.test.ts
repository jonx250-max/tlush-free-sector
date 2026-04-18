import { describe, it, expect } from 'vitest'
import { calculateHolidayGift } from './holidayGiftCalculator'

describe('calculateHolidayGift', () => {
  it('not expected when contract silent', () => {
    const r = calculateHolidayGift({
      contractMentionsGift: false, expectedGiftValue: 200,
      payslipGiftEntries: 0, monthsInPeriod: 1, isHolidayMonth: true,
    })
    expect(r.isExpected).toBe(false)
  })

  it('not expected outside holiday month', () => {
    const r = calculateHolidayGift({
      contractMentionsGift: true, expectedGiftValue: 200,
      payslipGiftEntries: 0, monthsInPeriod: 1, isHolidayMonth: false,
    })
    expect(r.isExpected).toBe(false)
  })

  it('reports shortfall when gift missing', () => {
    const r = calculateHolidayGift({
      contractMentionsGift: true, expectedGiftValue: 200,
      payslipGiftEntries: 0, monthsInPeriod: 1, isHolidayMonth: true,
    })
    expect(r.shortfall).toBe(200)
  })
})
