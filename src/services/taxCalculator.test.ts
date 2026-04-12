import { describe, it, expect } from 'vitest'
import {
  calculateIncomeTax,
  calculateCreditPoints,
  calculateRegionalBenefit,
  calculateFullTax,
} from './taxCalculator'
import type { CreditPointsInput } from './taxCalculator'
import type { Settlement } from '../data/settlements'

// Helper: default male profile with no extras
function baseMaleInput(overrides: Partial<CreditPointsInput> = {}): CreditPointsInput {
  return {
    gender: 'male',
    childrenBirthYears: [],
    academicDegree: 'none',
    degreeCompletionYear: null,
    militaryService: { served: false, dischargeYear: null, monthsServed: 0, isCombat: false },
    isNewImmigrant: false,
    immigrationDate: null,
    disabilityPercentage: 0,
    isSingleParent: false,
    reservistDays2026: 0,
    ...overrides,
  }
}

// ============================================================
// Income Tax Brackets
// ============================================================
describe('calculateIncomeTax', () => {
  it('returns 0 for zero income', () => {
    expect(calculateIncomeTax(0, 2026)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(calculateIncomeTax(-1000, 2026)).toBe(0)
  })

  it('calculates 10% for income within first bracket (2026)', () => {
    expect(calculateIncomeTax(7000, 2026)).toBe(700)
  })

  it('calculates progressive tax for 20,000 (2026)', () => {
    // 7010*0.10 + 3050*0.14 + 8940*0.20 + 1000*0.31
    const expected = 7010 * 0.10 + 3050 * 0.14 + 8940 * 0.20 + 1000 * 0.31
    expect(calculateIncomeTax(20000, 2026)).toBeCloseTo(expected, 0)
  })

  it('calculates top bracket for 70,000 (2026)', () => {
    // All brackets up to 60130, then 50% above
    const tax =
      7010 * 0.10 +
      3050 * 0.14 +
      8940 * 0.20 +
      6100 * 0.31 +
      17300 * 0.35 +
      17730 * 0.47 +
      (70000 - 60130) * 0.50
    expect(calculateIncomeTax(70000, 2026)).toBeCloseTo(tax, 0)
  })

  it('uses 2022 brackets correctly', () => {
    // First bracket 2022: 6450 * 0.10 = 645
    expect(calculateIncomeTax(6450, 2022)).toBeCloseTo(645, 0)
  })

  it('uses 2025 brackets correctly', () => {
    // First bracket 2025: 7010 * 0.10 = 701
    expect(calculateIncomeTax(7010, 2025)).toBeCloseTo(701, 0)
  })

  it('throws for unsupported year', () => {
    expect(() => calculateIncomeTax(10000, 2020)).toThrow()
  })
})

// ============================================================
// Credit Points
// ============================================================
describe('calculateCreditPoints', () => {
  it('gives 2.25 base for male', () => {
    const result = calculateCreditPoints(baseMaleInput(), 2026)
    expect(result.totalPoints).toBe(2.25)
  })

  it('gives 2.75 base for female', () => {
    const result = calculateCreditPoints(baseMaleInput({ gender: 'female' }), 2026)
    expect(result.totalPoints).toBe(2.75)
  })

  it('adds 2.5 points per child age 0-5', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ childrenBirthYears: [2023, 2024] }),
      2026,
    )
    // 2.25 base + 2.5 + 2.5 = 7.25
    expect(result.totalPoints).toBe(7.25)
  })

  it('adds 1.0 point per child age 6-17', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ childrenBirthYears: [2015] }),
      2026,
    )
    // 2.25 + 1.0 = 3.25
    expect(result.totalPoints).toBe(3.25)
  })

  it('adds 0.5 for child age 18', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ childrenBirthYears: [2008] }),
      2026,
    )
    expect(result.totalPoints).toBe(2.75) // 2.25 + 0.5
  })

  it('adds 1.0 for single parent', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ isSingleParent: true }),
      2026,
    )
    expect(result.totalPoints).toBe(3.25)
  })

  it('adds 1.0 for BA degree within 2 years', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ academicDegree: 'ba', degreeCompletionYear: 2025 }),
      2026,
    )
    expect(result.totalPoints).toBe(3.25)
  })

  it('does not add degree points if > 2 years', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ academicDegree: 'ba', degreeCompletionYear: 2020 }),
      2026,
    )
    expect(result.totalPoints).toBe(2.25)
  })

  it('adds 2.0 for military service >= 23 months', () => {
    const result = calculateCreditPoints(
      baseMaleInput({
        militaryService: { served: true, dischargeYear: 2025, monthsServed: 24, isCombat: false },
      }),
      2026,
    )
    expect(result.totalPoints).toBe(4.25) // 2.25 + 2.0
  })

  it('adds reservist combat tier points (2026)', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ reservistDays2026: 55 }),
      2026,
    )
    expect(result.totalPoints).toBe(3.75) // 2.25 + 1.5
  })

  it('adds 4.5 for new immigrant first year', () => {
    const result = calculateCreditPoints(
      baseMaleInput({ isNewImmigrant: true, immigrationDate: '2026-01-01' }),
      2026,
    )
    expect(result.totalPoints).toBe(6.75) // 2.25 + 4.5
  })

  it('calculates correct monthly value', () => {
    const result = calculateCreditPoints(baseMaleInput(), 2026)
    // 2.25 * 242 = 544.50
    expect(result.monthlyValue).toBeCloseTo(544.50, 0)
  })
})

// ============================================================
// Regional Benefits
// ============================================================
describe('calculateRegionalBenefit', () => {
  const sderot: Settlement = {
    name: 'שדרות',
    type: 'city',
    zone: 'frontline',
    creditPoints: 3.0,
    taxDiscountPct: 20,
    maxDiscountAnnual: 52_440,
  }

  const telAviv: Settlement = {
    name: 'תל אביב',
    type: 'city',
    zone: 'none',
    creditPoints: 0,
    taxDiscountPct: 0,
    maxDiscountAnnual: 0,
  }

  const eilat: Settlement = {
    name: 'אילת',
    type: 'city',
    zone: 'eilat',
    creditPoints: 4.0,
    taxDiscountPct: 10,
    maxDiscountAnnual: 262_320,
  }

  it('returns zero for center (no benefits)', () => {
    const result = calculateRegionalBenefit(telAviv, 15000, 2026)
    expect(result.totalBenefit).toBe(0)
  })

  it('calculates Sderot credit points', () => {
    const result = calculateRegionalBenefit(sderot, 15000, 2026)
    // 3.0 * 242 = 726
    expect(result.creditPointsValue).toBeCloseTo(726, 0)
  })

  it('calculates Sderot tax discount', () => {
    const result = calculateRegionalBenefit(sderot, 15000, 2026)
    expect(result.taxDiscountPct).toBe(20)
    expect(result.taxDiscountAmount).toBeGreaterThan(0)
  })

  it('calculates Eilat income exemption', () => {
    const result = calculateRegionalBenefit(eilat, 15000, 2026)
    expect(result.incomeExemption).toBeGreaterThan(0)
    // 15000 * 12 = 180000, below ceiling. 180000 * 0.10 / 12 = 1500
    expect(result.incomeExemption).toBeCloseTo(1500, 0)
  })

  it('caps Eilat exemption at ceiling', () => {
    const result = calculateRegionalBenefit(eilat, 30000, 2026)
    // 30000 * 12 = 360000 > 262320 ceiling
    // 262320 * 0.10 / 12 = 2186
    expect(result.incomeExemption).toBeCloseTo(2186, 0)
  })
})

// ============================================================
// Full Tax Calculation
// ============================================================
describe('calculateFullTax', () => {
  it('integrates tax + credits + regional for Sderot resident', () => {
    const sderot: Settlement = {
      name: 'שדרות',
      type: 'city',
      zone: 'frontline',
      creditPoints: 3.0,
      taxDiscountPct: 20,
      maxDiscountAnnual: 52_440,
    }

    const result = calculateFullTax(
      15000,
      baseMaleInput({ childrenBirthYears: [2023] }),
      sderot,
      2026,
    )

    expect(result.taxBeforeCredits).toBeGreaterThan(0)
    expect(result.creditPoints.totalPoints).toBe(4.75) // 2.25 + 2.5
    expect(result.regionalBenefit).not.toBeNull()
    expect(result.taxAfterCredits).toBeLessThan(result.taxBeforeCredits)
    expect(result.effectiveTaxRate).toBeLessThan(100)
  })

  it('works without settlement', () => {
    const result = calculateFullTax(10000, baseMaleInput(), null, 2026)
    expect(result.regionalBenefit).toBeNull()
    expect(result.taxAfterCredits).toBeLessThan(result.taxBeforeCredits)
  })
})
