import { describe, it, expect } from 'vitest'
import { grossToNet, netToGross } from './netGrossCalculator'
import type { NetGrossInput } from './netGrossCalculator'

const BASE_INPUT: NetGrossInput = {
  year: 2026,
  gender: 'male',
  pensionEmployeePct: 6,
  kerenEmployeePct: 2.5,
  creditPointsInput: {
    gender: 'male',
    childrenBirthYears: [],
    academicDegree: 'none',
    degreeCompletionYear: null,
    militaryService: { served: true, dischargeYear: 2020, monthsServed: 36, isCombat: false },
    isNewImmigrant: false,
    immigrationDate: null,
    disabilityPercentage: 0,
    isSingleParent: false,
    reservistDays2026: 0,
  },
}

describe('grossToNet', () => {
  it('calculates net from 15,000 gross', () => {
    const result = grossToNet(15_000, BASE_INPUT)
    expect(result.gross).toBe(15_000)
    expect(result.net).toBeLessThan(15_000)
    expect(result.net).toBeGreaterThan(8_000)
    expect(result.totalDeductions).toBeGreaterThan(0)
    expect(result.incomeTax).toBeGreaterThan(0)
    expect(result.nationalInsurance).toBeGreaterThan(0)
    expect(result.pensionEmployee).toBe(900) // 6% of 15000
    expect(result.kerenEmployee).toBe(375) // 2.5% of 15000
  })

  it('deductions increase with higher salary', () => {
    const low = grossToNet(10_000, BASE_INPUT)
    const high = grossToNet(30_000, BASE_INPUT)
    expect(high.totalDeductions).toBeGreaterThan(low.totalDeductions)
    expect(high.incomeTax).toBeGreaterThan(low.incomeTax)
  })

  it('net never exceeds gross', () => {
    const result = grossToNet(50_000, BASE_INPUT)
    expect(result.net).toBeLessThan(result.gross)
  })
})

describe('netToGross', () => {
  it('finds gross for target net of 10,000', () => {
    const result = netToGross(10_000, BASE_INPUT)
    expect(result.net).toBeCloseTo(10_000, -1) // within 10 ₪
    expect(result.gross).toBeGreaterThan(10_000)
  })

  it('is inverse of grossToNet', () => {
    const gross = 20_000
    const forward = grossToNet(gross, BASE_INPUT)
    const reverse = netToGross(forward.net, BASE_INPUT)
    expect(reverse.gross).toBeCloseTo(gross, -1) // within 10 ₪
  })
})
