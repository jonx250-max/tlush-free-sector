/**
 * Test fixture builder for law-table scenarios.
 *
 * Stage B Tier-2: takes a high-level ScenarioSpec, fills sensible defaults
 * for every ContractTerms / ParsedPayslip / ProfileData field, returns the
 * tuple expected by `compare()` in diffEngine.ts.
 *
 * Stage E will add Tier-1 hand-validated scenarios alongside these.
 */

import type {
  ContractTerms,
  ParsedPayslip,
  ExtractedField,
  PayModel,
} from '../../types'
import type { Settlement, TaxBenefitZone } from '../../data/settlements'
import type { ProfileData } from '../diffEngine'

export interface ScenarioSpec {
  name: string
  year: number

  // Contract side
  baseSalary: number
  payModel?: PayModel
  standardHoursPerWeek?: number
  workDaysPerWeek?: 5 | 6
  overtimeModel?: 'standard' | 'global' | 'none'
  globalOvertimeHours?: number | null
  globalOvertimeAmount?: number | null
  pensionEmployeePct?: number
  pensionEmployerPct?: number
  severanceEmployerPct?: number
  kerenHishtalmutEmployeePct?: number | null
  kerenHishtalmutEmployerPct?: number | null
  travelAllowanceContract?: number | null
  mealAllowanceContract?: number | null
  phoneAllowanceContract?: number | null
  sickDaysPerYear?: number
  vacationDaysPerYear?: number

  // Payslip side
  payslipBase?: number  // defaults to baseSalary
  grossSalary?: number  // defaults to baseSalary + overtimePay + commissionPay
  overtimePay?: number
  overtimeHours?: number
  globalOvertimeLine?: number | null
  commissionPay?: number
  bonusPay?: number
  travelAllowancePayslip?: number | null
  mealAllowancePayslip?: number | null
  phoneAllowancePayslip?: number | null
  incomeTax?: number
  nationalInsurance?: number
  healthInsurance?: number
  pensionEmployeePayslip?: number  // amount, not pct
  pensionEmployerPayslip?: number
  kerenEmployeePayslip?: number
  kerenEmployerPayslip?: number
  severanceEmployerPayslip?: number

  // Profile
  gender?: 'male' | 'female'
  childrenBirthYears?: number[]
  isSingleParent?: boolean
  isNewImmigrant?: boolean
  immigrationDate?: string | null
  yearsOfService?: number
  reservistDays?: number
  settlementZone?: TaxBenefitZone
  settlementCreditPoints?: number
  settlementTaxDiscountPct?: number
}

function field<T>(value: T, confidence = 1): ExtractedField<T> {
  return { value, confidence, sourceText: '', needsVerification: false }
}

function buildSettlement(spec: ScenarioSpec): Settlement | null {
  const zone = spec.settlementZone ?? 'none'
  if (zone === 'none') return null
  return {
    name: zone,
    type: 'city',
    zone,
    creditPoints: spec.settlementCreditPoints ?? 0,
    taxDiscountPct: spec.settlementTaxDiscountPct ?? 0,
    maxDiscountAnnual: 52_440,
  }
}

export interface ScenarioInput {
  contract: ContractTerms
  payslip: ParsedPayslip
  profile: ProfileData
  year: number
}

export function buildScenario(spec: ScenarioSpec): ScenarioInput {
  const payModel: PayModel = spec.payModel ?? 'monthly'
  const overtimeModel = spec.overtimeModel ?? 'standard'
  const overtimePay = spec.overtimePay ?? 0
  const commissionPay = spec.commissionPay ?? 0
  const bonusPay = spec.bonusPay ?? 0
  const grossSalary = spec.grossSalary
    ?? (spec.baseSalary + overtimePay + commissionPay + bonusPay)

  const contract: ContractTerms = {
    baseSalary: field(spec.baseSalary),
    payModel: field(payModel),
    hourlyRate: field(null),
    standardHoursPerWeek: field(spec.standardHoursPerWeek ?? 42),
    workDaysPerWeek: field(spec.workDaysPerWeek ?? 5),
    overtimeModel: field(overtimeModel),
    globalOvertimeHours: field(spec.globalOvertimeHours ?? null),
    globalOvertimeAmount: field(spec.globalOvertimeAmount ?? null),
    commissionStructure: field(null),
    bonuses: field([]),
    travelAllowance: field(spec.travelAllowanceContract ?? null),
    mealAllowance: field(spec.mealAllowanceContract ?? null),
    phoneAllowance: field(spec.phoneAllowanceContract ?? null),
    pensionEmployeePct: field(spec.pensionEmployeePct ?? 6),
    pensionEmployerPct: field(spec.pensionEmployerPct ?? 6.5),
    kerenHishtalmutEmployeePct: field(spec.kerenHishtalmutEmployeePct ?? null),
    kerenHishtalmutEmployerPct: field(spec.kerenHishtalmutEmployerPct ?? null),
    severanceEmployerPct: field(spec.severanceEmployerPct ?? 8.33),
    sickDaysPerYear: field(spec.sickDaysPerYear ?? 18),
    vacationDaysPerYear: field(spec.vacationDaysPerYear ?? 14),
    noticePeriodDays: field(30),
    effectiveDate: field(`${spec.year}-01-01`),
    specialClauses: [],
  }

  const basePay = spec.payslipBase ?? spec.baseSalary
  const payslip: ParsedPayslip = {
    month: 1,
    year: spec.year,
    grossSalary,
    netSalary: grossSalary - (spec.incomeTax ?? 0) - (spec.nationalInsurance ?? 0)
      - (spec.healthInsurance ?? 0) - (spec.pensionEmployeePayslip ?? 0)
      - (spec.kerenEmployeePayslip ?? 0),
    basePay,
    overtimePay: overtimePay || null,
    overtimeHours: spec.overtimeHours ?? null,
    globalOvertimeLine: spec.globalOvertimeLine ?? null,
    commissionPay: commissionPay || null,
    bonusPay: bonusPay || null,
    travelAllowance: spec.travelAllowancePayslip ?? null,
    mealAllowance: spec.mealAllowancePayslip ?? null,
    phoneAllowance: spec.phoneAllowancePayslip ?? null,
    sickPay: null,
    vacationPay: null,
    incomeTax: spec.incomeTax ?? null,
    nationalInsurance: spec.nationalInsurance ?? null,
    healthInsurance: spec.healthInsurance ?? null,
    pensionEmployee: spec.pensionEmployeePayslip ?? null,
    pensionEmployer: spec.pensionEmployerPayslip ?? null,
    kerenHishtalmutEmployee: spec.kerenEmployeePayslip ?? null,
    kerenHishtalmutEmployer: spec.kerenEmployerPayslip ?? null,
    severanceEmployer: spec.severanceEmployerPayslip ?? null,
    totalDeductions: null,
    totalEmployerCost: null,
    entries: [],
  }

  const profile: ProfileData = {
    gender: spec.gender ?? 'male',
    childrenBirthYears: spec.childrenBirthYears ?? [],
    academicDegree: 'none',
    degreeCompletionYear: null,
    militaryService: { served: false, dischargeYear: null, monthsServed: 0, isCombat: false },
    isNewImmigrant: spec.isNewImmigrant ?? false,
    immigrationDate: spec.immigrationDate ?? null,
    disabilityPercentage: 0,
    isSingleParent: spec.isSingleParent ?? false,
    reservistDays2026: spec.reservistDays ?? 0,
    settlement: buildSettlement(spec),
    yearsOfService: spec.yearsOfService ?? 1,
    workDaysPerWeek: spec.workDaysPerWeek ?? 5,
  }

  return { contract, payslip, profile, year: spec.year }
}
