// Tests for the masterDiagnosis orchestrator.
//
// Strategy: mock every calculator + the diffEngine `compare` so each test
// fully controls what inputs the orchestrator sees. We then assert the
// shape of the resulting findings array — categories, severities, gaps,
// and which builders are exercised under which contract/payslip/options.
//
// This lets us cover branch coverage without re-testing each calculator's
// own arithmetic (those have their own *.test.ts files).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  ContractTerms, ExtractedField, ParsedPayslip, PayModel, DiffResult,
  PayslipEntry,
} from '../types'
import type { ProfileData } from './diffEngine'

// ───── mocks ────────────────────────────────────────────────────────────

vi.mock('./diffEngine', () => ({
  compare: vi.fn(),
}))
vi.mock('./severanceCalculator', () => ({ calculateSeverance: vi.fn() }))
vi.mock('./holidayPayCalculator', () => ({ calculateHolidayPay: vi.fn() }))
vi.mock('./commuteCalculator', () => ({ calculateCommute: vi.fn() }))
vi.mock('./advanceNoticeCalculator', () => ({ calculateAdvanceNotice: vi.fn() }))
vi.mock('./holidayGiftCalculator', () => ({ calculateHolidayGift: vi.fn() }))
vi.mock('./thirteenthSalaryCalculator', () => ({ calculateThirteenthSalary: vi.fn() }))
vi.mock('./shiftDifferentialCalculator', () => ({ calculateShiftDifferential: vi.fn() }))
vi.mock('./illegalDeductionsDetector', () => ({ detectIllegalDeductions: vi.fn() }))

import { runMasterDiagnosis } from './masterDiagnosis'
import { compare } from './diffEngine'
import { calculateSeverance } from './severanceCalculator'
import { calculateHolidayPay } from './holidayPayCalculator'
import { calculateCommute } from './commuteCalculator'
import { calculateAdvanceNotice } from './advanceNoticeCalculator'
import { calculateHolidayGift } from './holidayGiftCalculator'
import { calculateThirteenthSalary } from './thirteenthSalaryCalculator'
import { calculateShiftDifferential } from './shiftDifferentialCalculator'
import { detectIllegalDeductions } from './illegalDeductionsDetector'

// ───── factories ────────────────────────────────────────────────────────

function field<T>(value: T): ExtractedField<T> {
  return { value, confidence: 1, needsVerification: false }
}

function makeContract(overrides: Partial<{
  payModel: PayModel
  workDaysPerWeek: 5 | 6
  travelAllowance: number | null
  hourlyRate: number | null
  noticePeriodDays: number
  effectiveDate: string
  baseSalary: number
  specialClauses: string[]
}> = {}): ContractTerms {
  return {
    baseSalary: field(overrides.baseSalary ?? 10_000),
    payModel: field<PayModel>(overrides.payModel ?? 'monthly'),
    hourlyRate: field<number | null>(overrides.hourlyRate ?? null),
    standardHoursPerWeek: field(42),
    workDaysPerWeek: field<5 | 6>(overrides.workDaysPerWeek ?? 5),
    overtimeModel: field<'standard' | 'global' | 'none'>('standard'),
    globalOvertimeHours: field<number | null>(null),
    globalOvertimeAmount: field<number | null>(null),
    commissionStructure: field(null),
    bonuses: field([]),
    travelAllowance: field<number | null>(overrides.travelAllowance ?? null),
    mealAllowance: field<number | null>(null),
    phoneAllowance: field<number | null>(null),
    pensionEmployeePct: field(6),
    pensionEmployerPct: field(6.5),
    kerenHishtalmutEmployeePct: field<number | null>(null),
    kerenHishtalmutEmployerPct: field<number | null>(null),
    severanceEmployerPct: field(8.33),
    sickDaysPerYear: field(18),
    vacationDaysPerYear: field(12),
    noticePeriodDays: field(overrides.noticePeriodDays ?? 30),
    effectiveDate: field(overrides.effectiveDate ?? '2020-01-01'),
    specialClauses: overrides.specialClauses ?? [],
  }
}

function makePayslip(overrides: Partial<ParsedPayslip> = {}): ParsedPayslip {
  return {
    month: 1,
    year: 2026,
    grossSalary: 10_000,
    netSalary: 7_500,
    basePay: 10_000,
    overtimePay: null,
    overtimeHours: null,
    globalOvertimeLine: null,
    commissionPay: null,
    bonusPay: null,
    travelAllowance: null,
    mealAllowance: null,
    phoneAllowance: null,
    sickPay: null,
    vacationPay: null,
    incomeTax: null,
    nationalInsurance: null,
    healthInsurance: null,
    pensionEmployee: null,
    pensionEmployer: null,
    kerenHishtalmutEmployee: null,
    kerenHishtalmutEmployer: null,
    severanceEmployer: null,
    totalDeductions: null,
    totalEmployerCost: null,
    entries: [],
    ...overrides,
  }
}

function makeProfile(): ProfileData {
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
    yearsOfService: 0,
    workDaysPerWeek: 5,
  }
}

const EMPTY_BASE_DIFF: DiffResult = {
  findings: [],
  summary: { totalFindings: 0, critical: 0, warning: 0, info: 0, totalGapAmount: 0 },
  overtimeAnalysis: { model: 'none', expectedPay: 0, actualPay: 0, gap: 0, effectiveHourlyRate: 0 },
  taxAnalysis: { expectedTax: 0, actualTax: 0, overcharge: 0, creditPoints: 0, creditPointsValue: 0, regionalBenefitValue: 0 },
}

function zeroSeverance() {
  return {
    yearsOfService: 0, monthsOfService: 0,
    expectedSeverance: 0, alreadyAccrued: 0, shortfall: 0,
    form161TaxFreeCeiling: 0, form161Taxable: 0, isEligible: false,
  }
}

function zeroNotice() {
  return { applicableDays: 0, expectedNoticePay: 0, actualNoticePay: 0, shortfall: 0 }
}

function zeroHolidayPay() {
  return { isEligible: false, expectedHolidayPay: 0, actualHolidayPay: 0, shortfall: 0, reason: '' }
}

function zeroCommute() {
  return { expectedReimbursement: 0, actualReimbursement: 0, shortfall: 0, hasData: false }
}

function zeroGift() {
  return { expectedValue: 0, actualValue: 0, shortfall: 0, note: '' }
}

function zero13() {
  return { expectedAmount: 0, actualAmount: 0, shortfall: 0 }
}

function zeroShift() {
  return { hasShifts: false, expectedDifferential: 0, actualDifferential: 0, shortfall: 0 }
}

function zeroIllegal() {
  return { suspiciousDeductions: [] as Array<{ name: string; amount: number; reason: string }> }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(compare).mockReturnValue(EMPTY_BASE_DIFF)
  vi.mocked(calculateSeverance).mockReturnValue(zeroSeverance())
  vi.mocked(calculateAdvanceNotice).mockReturnValue(zeroNotice())
  vi.mocked(calculateHolidayPay).mockReturnValue(zeroHolidayPay())
  vi.mocked(calculateCommute).mockReturnValue(zeroCommute())
  vi.mocked(calculateHolidayGift).mockReturnValue(zeroGift())
  vi.mocked(calculateThirteenthSalary).mockReturnValue(zero13())
  vi.mocked(calculateShiftDifferential).mockReturnValue(zeroShift())
  vi.mocked(detectIllegalDeductions).mockReturnValue(zeroIllegal())
})

// ───── tests ────────────────────────────────────────────────────────────

describe('runMasterDiagnosis', () => {
  it('returns empty findings when every check is clean', () => {
    const result = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(result.findings).toHaveLength(0)
    expect(result.summary.critical).toBe(0)
    expect(result.summary.warning).toBe(0)
  })

  it('passes through base diffEngine findings', () => {
    vi.mocked(compare).mockReturnValueOnce({
      ...EMPTY_BASE_DIFF,
      findings: [{
        category: 'base_pay', fieldName: 'בסיס', contractValue: 10000, payslipValue: 9000,
        gap: 1000, gapDirection: 'underpaid', severity: 'critical', legalReference: null, explanation: '',
      }],
    })
    const result = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].category).toBe('base_pay')
  })

  it('emits severance + form-161 + advance-notice findings on termination with shortfall over the 161 ceiling', () => {
    vi.mocked(calculateSeverance).mockReturnValue({
      yearsOfService: 6, monthsOfService: 72,
      expectedSeverance: 180_000, alreadyAccrued: 50_000, shortfall: 130_000,
      form161TaxFreeCeiling: 82_500, form161Taxable: 97_500, isEligible: true,
    })
    vi.mocked(calculateAdvanceNotice).mockReturnValue({
      applicableDays: 30, expectedNoticePay: 13_636, actualNoticePay: 0, shortfall: 13_636,
    })
    const result = runMasterDiagnosis(
      makeContract({ baseSalary: 30_000 }),
      makePayslip({ grossSalary: 30_000 }),
      makeProfile(),
      2026,
      { isTermination: true, terminationDate: '2026-01-31' },
    )
    expect(result.findings.map(f => f.category).sort()).toEqual(
      ['advance_notice', 'severance', 'severance_form_161'],
    )
    const sev = result.findings.find(f => f.category === 'severance')!
    expect(sev.severity).toBe('critical')
    expect(sev.gap).toBe(130_000)
    const f161 = result.findings.find(f => f.category === 'severance_form_161')!
    expect(f161.severity).toBe('info')
    expect(f161.gapDirection).toBe('not_in_contract')
  })

  it('emits severance only (no form 161) when shortfall is fully under the tax-free ceiling', () => {
    vi.mocked(calculateSeverance).mockReturnValue({
      yearsOfService: 2, monthsOfService: 24,
      expectedSeverance: 20_000, alreadyAccrued: 5_000, shortfall: 15_000,
      form161TaxFreeCeiling: 27_500, form161Taxable: 0, isEligible: true,
    })
    const result = runMasterDiagnosis(
      makeContract(),
      makePayslip(),
      makeProfile(),
      2026,
      { isTermination: true, terminationDate: '2026-01-31' },
    )
    const categories = result.findings.map(f => f.category)
    expect(categories).toContain('severance')
    expect(categories).not.toContain('severance_form_161')
  })

  it('does not run severance/notice builders when not a termination event', () => {
    vi.mocked(calculateSeverance).mockReturnValue({
      ...zeroSeverance(), shortfall: 99_999,
    })
    const result = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026, {})
    expect(calculateSeverance).not.toHaveBeenCalled()
    expect(result.findings.find(f => f.category === 'severance')).toBeUndefined()
  })

  it('only runs holiday-pay builder for hourly/shift contracts', () => {
    vi.mocked(calculateHolidayPay).mockReturnValue({
      isEligible: true, expectedHolidayPay: 600, actualHolidayPay: 0, shortfall: 600, reason: 'דמי חגים חסרים',
    })
    runMasterDiagnosis(makeContract({ payModel: 'monthly' }), makePayslip(), makeProfile(), 2026)
    expect(calculateHolidayPay).not.toHaveBeenCalled()

    const result = runMasterDiagnosis(
      makeContract({ payModel: 'hourly', hourlyRate: 50 }),
      makePayslip(),
      makeProfile(),
      2026,
    )
    expect(result.findings.some(f => f.category === 'holiday_pay')).toBe(true)
  })

  it('emits commute finding only when shortfall > 50 ₪ and data is present', () => {
    vi.mocked(calculateCommute).mockReturnValue({
      expectedReimbursement: 600, actualReimbursement: 580, shortfall: 20, hasData: true,
    })
    let r = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(r.findings.some(f => f.category === 'commute_reimbursement')).toBe(false)

    vi.mocked(calculateCommute).mockReturnValue({
      expectedReimbursement: 600, actualReimbursement: 400, shortfall: 200, hasData: true,
    })
    r = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(r.findings.some(f => f.category === 'commute_reimbursement')).toBe(true)
  })

  it('emits holiday-gift finding only when contract has a gift clause and a shortfall exists', () => {
    vi.mocked(calculateHolidayGift).mockReturnValue({
      expectedValue: 200, actualValue: 0, shortfall: 200, note: 'שי לחג חסר',
    })
    // no clause → skipped entirely
    let r = runMasterDiagnosis(makeContract(), makePayslip({ month: 4 }), makeProfile(), 2026)
    expect(calculateHolidayGift).not.toHaveBeenCalled()
    expect(r.findings.some(f => f.category === 'holiday_gift')).toBe(false)

    // clause present → builder runs and emits
    r = runMasterDiagnosis(
      makeContract({ specialClauses: ['שי לחג פסח של 200 ש"ח'] }),
      makePayslip({ month: 4 }),
      makeProfile(),
      2026,
    )
    expect(r.findings.some(f => f.category === 'holiday_gift')).toBe(true)
  })

  it('emits 13th-salary finding when calculator reports shortfall', () => {
    vi.mocked(calculateThirteenthSalary).mockReturnValue({
      expectedAmount: 10_000, actualAmount: 0, shortfall: 10_000,
    })
    const r = runMasterDiagnosis(
      makeContract({ specialClauses: ['משכורת 13'] }),
      makePayslip({ month: 12 }),
      makeProfile(),
      2026,
    )
    const f = r.findings.find(x => x.category === 'thirteenth_salary')
    expect(f).toBeDefined()
    expect(f!.gap).toBe(10_000)
    expect(f!.severity).toBe('warning')
  })

  it('emits shift-differential finding only for shift contracts when calculator reports shortfall', () => {
    vi.mocked(calculateShiftDifferential).mockReturnValue({
      hasShifts: true, expectedDifferential: 300, actualDifferential: 100, shortfall: 200,
    })
    let r = runMasterDiagnosis(makeContract({ payModel: 'monthly' }), makePayslip(), makeProfile(), 2026)
    expect(r.findings.some(f => f.category === 'shift_differential')).toBe(false)

    r = runMasterDiagnosis(makeContract({ payModel: 'shift' }), makePayslip(), makeProfile(), 2026)
    expect(r.findings.some(f => f.category === 'shift_differential')).toBe(true)
  })

  it('emits one illegal-deduction finding per suspicious entry', () => {
    vi.mocked(detectIllegalDeductions).mockReturnValue({
      suspiciousDeductions: [
        { name: 'הסכמה שאינה בכתב', amount: 500, reason: 'אין הסכמה כתובה' },
        { name: 'קנס איחור', amount: 250, reason: 'קנסות אסורות לפי חוק הגנת השכר' },
      ],
    })
    const entries: PayslipEntry[] = [
      { code: 'X', name: 'הסכמה שאינה בכתב', amount: 500, section: 'deductions' },
      { code: 'Y', name: 'קנס איחור', amount: 250, section: 'deductions' },
    ]
    const r = runMasterDiagnosis(makeContract(), makePayslip({ entries }), makeProfile(), 2026)
    const illegal = r.findings.filter(f => f.category === 'illegal_deduction')
    expect(illegal).toHaveLength(2)
    expect(illegal.every(f => f.gapDirection === 'overpaid' && f.severity === 'warning')).toBe(true)
  })

  it('summary aggregates severities and rounds totalGapAmount to 2dp', () => {
    vi.mocked(compare).mockReturnValueOnce({
      ...EMPTY_BASE_DIFF,
      findings: [
        { category: 'base_pay', fieldName: 'a', contractValue: null, payslipValue: null,
          gap: 100.555, gapDirection: 'underpaid', severity: 'critical', legalReference: null, explanation: '' },
        { category: 'overtime', fieldName: 'b', contractValue: null, payslipValue: null,
          gap: 50.123, gapDirection: 'underpaid', severity: 'warning', legalReference: null, explanation: '' },
        { category: 'pension_employee', fieldName: 'c', contractValue: null, payslipValue: null,
          gap: 0, gapDirection: 'match', severity: 'info', legalReference: null, explanation: '' },
      ],
    })
    const r = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(r.summary.totalFindings).toBe(3)
    expect(r.summary.critical).toBe(1)
    expect(r.summary.warning).toBe(1)
    expect(r.summary.info).toBe(1)
    expect(r.summary.totalGapAmount).toBeCloseTo(150.68, 2)
  })

  it('Eilat-style scenario: regional tax benefit feeds through compare; orchestrator preserves it', () => {
    vi.mocked(compare).mockReturnValueOnce({
      ...EMPTY_BASE_DIFF,
      taxAnalysis: { expectedTax: 1500, actualTax: 1500, overcharge: 0,
        creditPoints: 2.25, creditPointsValue: 600, regionalBenefitValue: 1200 },
    })
    const r = runMasterDiagnosis(makeContract(), makePayslip(), makeProfile(), 2026)
    expect(r.taxAnalysis.regionalBenefitValue).toBe(1200)
  })

  it('uses 25-day divisor for 6-day workweek in derived dailyWage (advance-notice path)', () => {
    runMasterDiagnosis(
      makeContract({ baseSalary: 12_500, workDaysPerWeek: 6 }),
      makePayslip({ basePay: 12_500 }),
      makeProfile(),
      2026,
      { isTermination: true, terminationDate: '2026-12-31' },
    )
    const noticeArg = vi.mocked(calculateAdvanceNotice).mock.calls[0][0]
    expect(noticeArg.lastDailyWage).toBeCloseTo(500, 5)
    expect(noticeArg.isMonthlyEmployee).toBe(true)
  })

  it('uses 22-day divisor for 5-day workweek', () => {
    runMasterDiagnosis(
      makeContract({ baseSalary: 11_000, workDaysPerWeek: 5 }),
      makePayslip({ basePay: 11_000 }),
      makeProfile(),
      2026,
      { isTermination: true, terminationDate: '2026-12-31' },
    )
    const noticeArg = vi.mocked(calculateAdvanceNotice).mock.calls[0][0]
    expect(noticeArg.lastDailyWage).toBeCloseTo(500, 5)
  })
})
