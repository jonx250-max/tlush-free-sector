import { describe, it, expect } from 'vitest'
import { calculateAdvanceNotice } from './advanceNoticeCalculator'

describe('calculateAdvanceNotice', () => {
  it('1 day per month in first 6 months (monthly employee)', () => {
    const r = calculateAdvanceNotice({
      monthsEmployed: 4, contractNoticeDays: null, payslipNoticePay: 0,
      lastDailyWage: 500, isMonthlyEmployee: true,
    })
    expect(r.legalMinimumDays).toBe(4)
    expect(r.expectedNoticePay).toBe(2000)
  })

  it('30 days after 1 year (monthly)', () => {
    const r = calculateAdvanceNotice({
      monthsEmployed: 24, contractNoticeDays: null, payslipNoticePay: 0,
      lastDailyWage: 500, isMonthlyEmployee: true,
    })
    expect(r.legalMinimumDays).toBe(30)
    expect(r.expectedNoticePay).toBe(15000)
  })

  it('uses contract days if greater than legal', () => {
    const r = calculateAdvanceNotice({
      monthsEmployed: 24, contractNoticeDays: 60, payslipNoticePay: 30000,
      lastDailyWage: 500, isMonthlyEmployee: true,
    })
    expect(r.applicableDays).toBe(60)
    expect(r.shortfall).toBe(0)
  })

  it('reports shortfall when payslip below expected', () => {
    const r = calculateAdvanceNotice({
      monthsEmployed: 24, contractNoticeDays: null, payslipNoticePay: 5000,
      lastDailyWage: 500, isMonthlyEmployee: true,
    })
    expect(r.shortfall).toBe(10000)
  })
})
