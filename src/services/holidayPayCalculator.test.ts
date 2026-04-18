import { describe, it, expect } from 'vitest'
import { calculateHolidayPay } from './holidayPayCalculator'

describe('calculateHolidayPay', () => {
  it('not eligible for monthly pay model (already included)', () => {
    const r = calculateHolidayPay({
      payModel: 'monthly', monthsEmployed: 12, hourlyRate: null,
      hoursPerDay: 8, payslipHolidayPay: 0, holidayDaysInMonth: 2,
    })
    expect(r.isEligible).toBe(false)
  })

  it('not eligible in first 3 months', () => {
    const r = calculateHolidayPay({
      payModel: 'hourly', monthsEmployed: 2, hourlyRate: 50,
      hoursPerDay: 8, payslipHolidayPay: 0, holidayDaysInMonth: 1,
    })
    expect(r.isEligible).toBe(false)
  })

  it('calculates expected = days × hours × rate', () => {
    const r = calculateHolidayPay({
      payModel: 'hourly', monthsEmployed: 12, hourlyRate: 50,
      hoursPerDay: 8, payslipHolidayPay: 0, holidayDaysInMonth: 2,
    })
    // 2 × 8 × 50 = 800
    expect(r.expectedHolidayPay).toBe(800)
    expect(r.shortfall).toBe(800)
  })

  it('zero shortfall when payslip matches', () => {
    const r = calculateHolidayPay({
      payModel: 'hourly', monthsEmployed: 12, hourlyRate: 50,
      hoursPerDay: 8, payslipHolidayPay: 800, holidayDaysInMonth: 2,
    })
    expect(r.shortfall).toBe(0)
  })
})
