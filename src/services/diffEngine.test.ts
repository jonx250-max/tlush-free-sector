import { describe, it, expect } from 'vitest'
import { compare } from './diffEngine'
import type { ProfileData } from './diffEngine'
import type { ContractTerms, ParsedPayslip, ExtractedField } from '../types'

// Helpers
function ef<T>(value: T, confidence = 0.9): ExtractedField<T> {
  return { value, confidence, needsVerification: false }
}

function makeContract(overrides: Partial<ContractTerms> = {}): ContractTerms {
  return {
    baseSalary: ef(12000),
    payModel: ef('monthly' as const),
    hourlyRate: ef(null),
    standardHoursPerWeek: ef(42),
    workDaysPerWeek: ef(5 as const),
    overtimeModel: ef('standard' as const),
    globalOvertimeHours: ef(null),
    globalOvertimeAmount: ef(null),
    commissionStructure: ef(null),
    bonuses: ef([]),
    travelAllowance: ef(500),
    mealAllowance: ef(null),
    phoneAllowance: ef(null),
    pensionEmployeePct: ef(6),
    pensionEmployerPct: ef(6.5),
    kerenHishtalmutEmployeePct: ef(2.5),
    kerenHishtalmutEmployerPct: ef(7.5),
    severanceEmployerPct: ef(8.33),
    sickDaysPerYear: ef(18),
    vacationDaysPerYear: ef(12),
    noticePeriodDays: ef(30),
    effectiveDate: ef('2024-01-01'),
    specialClauses: [],
    ...overrides,
  }
}

function makePayslip(overrides: Partial<ParsedPayslip> = {}): ParsedPayslip {
  return {
    month: 1,
    year: 2026,
    grossSalary: 12000,
    netSalary: 9000,
    basePay: 12000,
    overtimePay: null,
    overtimeHours: null,
    globalOvertimeLine: null,
    commissionPay: null,
    bonusPay: null,
    travelAllowance: 500,
    mealAllowance: null,
    phoneAllowance: null,
    sickPay: null,
    vacationPay: null,
    incomeTax: 800,
    nationalInsurance: 400,
    healthInsurance: 300,
    pensionEmployee: 720,
    pensionEmployer: 780,
    kerenHishtalmutEmployee: 300,
    kerenHishtalmutEmployer: 900,
    severanceEmployer: 1000,
    totalDeductions: 2520,
    totalEmployerCost: 14680,
    entries: [],
    ...overrides,
  }
}

function makeProfile(overrides: Partial<ProfileData> = {}): ProfileData {
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
    settlement: null,
    yearsOfService: 3,
    workDaysPerWeek: 5,
    ...overrides,
  }
}

describe('diffEngine.compare', () => {
  it('produces no gap findings when contract matches payslip', () => {
    const result = compare(makeContract(), makePayslip(), makeProfile(), 2026)
    const underpaid = result.findings.filter(f => f.gapDirection === 'underpaid')
    expect(underpaid.length).toBe(0)
  })

  it('detects underpaid base salary', () => {
    const result = compare(
      makeContract({ baseSalary: ef(14000) }),
      makePayslip({ basePay: 12000, grossSalary: 12000 }),
      makeProfile(),
      2026,
    )
    const baseFinding = result.findings.find(f => f.category === 'base_pay')
    expect(baseFinding).toBeDefined()
    expect(baseFinding!.gapDirection).toBe('underpaid')
    expect(baseFinding!.gap).toBe(2000)
  })

  it('detects Amendment 24 violation', () => {
    const result = compare(
      makeContract({ overtimeModel: ef('global' as const) }),
      makePayslip({ grossSalary: 15000, basePay: 15000, globalOvertimeLine: null }),
      makeProfile(),
      2026,
    )
    const a24 = result.findings.find(f => f.category === 'amendment24')
    expect(a24).toBeDefined()
    expect(a24!.severity).toBe('critical')
  })

  it('detects commission excluded from pension base', () => {
    const result = compare(
      makeContract(),
      makePayslip({ commissionPay: 5000, pensionEmployee: 720 }), // pension only on 12000
      makeProfile(),
      2026,
    )
    const commFinding = result.findings.find(f => f.category === 'commission')
    expect(commFinding).toBeDefined()
    expect(commFinding!.severity).toBe('critical')
  })

  it('detects below minimum wage', () => {
    const result = compare(
      makeContract({ baseSalary: ef(5500) }),
      makePayslip({ grossSalary: 5500, basePay: 5500 }),
      makeProfile(),
      2026,
    )
    const minWage = result.findings.find(f => f.category === 'minimum_wage')
    expect(minWage).toBeDefined()
    expect(minWage!.severity).toBe('critical')
  })

  it('detects missing travel allowance', () => {
    const result = compare(
      makeContract({ travelAllowance: ef(500) }),
      makePayslip({ travelAllowance: null }),
      makeProfile(),
      2026,
    )
    const travel = result.findings.find(f => f.category === 'travel')
    expect(travel).toBeDefined()
    expect(travel!.gapDirection).toBe('missing_from_payslip')
  })

  it('builds summary with correct counts', () => {
    const result = compare(
      makeContract({ baseSalary: ef(14000), overtimeModel: ef('global' as const) }),
      makePayslip({ basePay: 12000, grossSalary: 12000 }),
      makeProfile(),
      2026,
    )
    expect(result.summary.totalFindings).toBeGreaterThan(0)
    expect(result.summary.totalGapAmount).toBeGreaterThan(0)
  })

  it('produces overtime analysis', () => {
    const result = compare(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(result.overtimeAnalysis).toBeDefined()
    expect(result.overtimeAnalysis.effectiveHourlyRate).toBeGreaterThan(0)
  })

  it('produces tax analysis', () => {
    const result = compare(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(result.taxAnalysis).toBeDefined()
    expect(result.taxAnalysis.expectedTax).toBeGreaterThanOrEqual(0)
  })

  it('detects tax overcharge with Sderot resident', () => {
    const sderot = {
      name: 'שדרות',
      type: 'city' as const,
      zone: 'frontline' as const,
      creditPoints: 3.0,
      taxDiscountPct: 20,
      maxDiscountAnnual: 52_440,
    }
    const result = compare(
      makeContract(),
      makePayslip({ incomeTax: 1500 }), // overpaying
      makeProfile({ settlement: sderot }),
      2026,
    )
    const taxFinding = result.findings.find(f => f.category === 'income_tax')
    // With Sderot benefits, expected tax should be lower than 1500
    expect(taxFinding).toBeDefined()
    expect(taxFinding!.gapDirection).toBe('overpaid')
  })
})
