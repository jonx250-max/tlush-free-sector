import { describe, it, expect } from 'vitest'
import { calculateCommute } from './commuteCalculator'

describe('calculateCommute', () => {
  it('returns hasData=false when no card cost or payslip travel', () => {
    const r = calculateCommute({ workDaysInMonth: 22, monthlyTravelCardCost: null, payslipTravelAllowance: null })
    expect(r.hasData).toBe(false)
  })

  it('reimburses up to daily cap × work days', () => {
    const r = calculateCommute({ workDaysInMonth: 22, monthlyTravelCardCost: 1000, payslipTravelAllowance: 0 })
    // cap = 22 × 22.6 = 497.2; expected = min(1000, 497.2) = 497.2
    expect(r.expectedReimbursement).toBe(497.2)
    expect(r.shortfall).toBe(497.2)
  })

  it('reimburses card cost when below cap', () => {
    const r = calculateCommute({ workDaysInMonth: 22, monthlyTravelCardCost: 200, payslipTravelAllowance: 200 })
    expect(r.shortfall).toBe(0)
  })
})
