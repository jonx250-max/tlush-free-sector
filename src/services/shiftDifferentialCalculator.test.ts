import { describe, it, expect } from 'vitest'
import { calculateShiftDifferential } from './shiftDifferentialCalculator'

describe('calculateShiftDifferential', () => {
  it('hasShifts=false when no shift hours', () => {
    const r = calculateShiftDifferential({
      eveningShiftHours: 0, nightShiftHours: 0, hourlyRate: 50,
      payslipShiftDifferential: 0, eveningPremiumPct: 25, nightPremiumPct: 50,
    })
    expect(r.hasShifts).toBe(false)
  })

  it('calculates evening + night premium', () => {
    const r = calculateShiftDifferential({
      eveningShiftHours: 10, nightShiftHours: 8, hourlyRate: 50,
      payslipShiftDifferential: 0, eveningPremiumPct: 25, nightPremiumPct: 50,
    })
    // evening 10 × 50 × 0.25 = 125; night 8 × 50 × 0.5 = 200; total 325
    expect(r.expectedDifferential).toBe(325)
    expect(r.shortfall).toBe(325)
  })

  it('zero shortfall when payslip matches', () => {
    const r = calculateShiftDifferential({
      eveningShiftHours: 10, nightShiftHours: 0, hourlyRate: 50,
      payslipShiftDifferential: 125, eveningPremiumPct: 25, nightPremiumPct: 50,
    })
    expect(r.shortfall).toBe(0)
  })
})
