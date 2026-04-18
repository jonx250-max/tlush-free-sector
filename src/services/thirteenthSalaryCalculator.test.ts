import { describe, it, expect } from 'vitest'
import { calculateThirteenthSalary } from './thirteenthSalaryCalculator'

describe('calculateThirteenthSalary', () => {
  it('skips if contract silent', () => {
    const r = calculateThirteenthSalary({
      contractMentions13thSalary: false, expectedAmount: 10000,
      payslipBonusPay: 0, monthlyBaseGross: 10000, monthOfYear: 12,
      expectedPaymentMonths: [12],
    })
    expect(r.isExpected).toBe(false)
  })

  it('skips outside payment month', () => {
    const r = calculateThirteenthSalary({
      contractMentions13thSalary: true, expectedAmount: null,
      payslipBonusPay: 0, monthlyBaseGross: 10000, monthOfYear: 6,
      expectedPaymentMonths: [12],
    })
    expect(r.isPaymentMonth).toBe(false)
    expect(r.shortfall).toBe(0)
  })

  it('shortfall = expected - actual in payment month', () => {
    const r = calculateThirteenthSalary({
      contractMentions13thSalary: true, expectedAmount: 10000,
      payslipBonusPay: 4000, monthlyBaseGross: 10000, monthOfYear: 12,
      expectedPaymentMonths: [12],
    })
    expect(r.shortfall).toBe(6000)
  })

  it('uses monthly base when expected amount null', () => {
    const r = calculateThirteenthSalary({
      contractMentions13thSalary: true, expectedAmount: null,
      payslipBonusPay: 0, monthlyBaseGross: 10000, monthOfYear: 12,
      expectedPaymentMonths: [12],
    })
    expect(r.expectedAmount).toBe(10000)
    expect(r.shortfall).toBe(10000)
  })
})
