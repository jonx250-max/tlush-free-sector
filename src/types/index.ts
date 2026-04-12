// ===== Core User Types =====

export interface User {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

export interface UserProfile {
  id: string
  fullName: string | null
  avatarUrl: string | null
  phoneNumber: string | null
  personalInfo: PersonalInfo
  employmentInfo: EmploymentInfo
  createdAt: string
  updatedAt: string | null
}

export interface PersonalInfo {
  gender?: 'male' | 'female'
  idNumber?: string
  childrenCount?: number
  childrenBirthYears?: number[]
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  settlementName?: string
  academicDegree?: 'none' | 'bachelor' | 'master' | 'doctorate'
  degreeCompletionYear?: number
  militaryService?: {
    served: boolean
    dischargeYear?: number
    monthsServed?: number
    isCombat?: boolean
  }
  isNewImmigrant?: boolean
  immigrationDate?: string
  disabilityPercentage?: number
  isSingleParent?: boolean
  reservistDays2025?: number
  reservistDays2026?: number
}

export interface EmploymentInfo {
  employerName?: string
  employerId?: string
  startDate?: string
  jobTitle?: string
  payModel?: PayModel
  workDaysPerWeek?: 5 | 6
  isShiftWorker?: boolean
  hasCommission?: boolean
  pensionFund?: string
  pensionRateEmployee?: number
  pensionRateEmployer?: number
  hasKerenHishtalmut?: boolean
  kerenRateEmployee?: number
  kerenRateEmployer?: number
}

// ===== Pay Model =====

export type PayModel = 'monthly' | 'hourly' | 'shift' | 'commission' | 'global'

// ===== Contract Types =====

export interface ExtractedField<T> {
  value: T
  confidence: number
  sourceText?: string
  needsVerification: boolean
}

export interface CommissionStructure {
  type: 'percentage' | 'fixed' | 'tiered'
  rate: number | null
  tiers: { threshold: number; rate: number }[] | null
  isIncludedInBase: boolean
}

export interface BonusDefinition {
  name: string
  amount: number
  frequency: 'monthly' | 'quarterly' | 'annual'
}

export interface ContractTerms {
  baseSalary: ExtractedField<number>
  payModel: ExtractedField<PayModel>
  hourlyRate: ExtractedField<number | null>
  standardHoursPerWeek: ExtractedField<number>
  workDaysPerWeek: ExtractedField<5 | 6>
  overtimeModel: ExtractedField<'standard' | 'global' | 'none'>
  globalOvertimeHours: ExtractedField<number | null>
  globalOvertimeAmount: ExtractedField<number | null>
  commissionStructure: ExtractedField<CommissionStructure | null>
  bonuses: ExtractedField<BonusDefinition[]>
  travelAllowance: ExtractedField<number | null>
  mealAllowance: ExtractedField<number | null>
  phoneAllowance: ExtractedField<number | null>
  pensionEmployeePct: ExtractedField<number>
  pensionEmployerPct: ExtractedField<number>
  kerenHishtalmutEmployeePct: ExtractedField<number | null>
  kerenHishtalmutEmployerPct: ExtractedField<number | null>
  severanceEmployerPct: ExtractedField<number>
  sickDaysPerYear: ExtractedField<number>
  vacationDaysPerYear: ExtractedField<number>
  noticePeriodDays: ExtractedField<number>
  effectiveDate: ExtractedField<string>
  specialClauses: string[]
}

// ===== Payslip Types =====

export interface PayslipEntry {
  code: string
  name: string
  amount: number
  section: 'earnings' | 'deductions' | 'employer'
}

export interface ParsedPayslip {
  month: number
  year: number
  grossSalary: number
  netSalary: number
  basePay: number | null
  overtimePay: number | null
  overtimeHours: number | null
  globalOvertimeLine: number | null
  commissionPay: number | null
  bonusPay: number | null
  travelAllowance: number | null
  mealAllowance: number | null
  phoneAllowance: number | null
  sickPay: number | null
  vacationPay: number | null
  incomeTax: number | null
  nationalInsurance: number | null
  healthInsurance: number | null
  pensionEmployee: number | null
  pensionEmployer: number | null
  kerenHishtalmutEmployee: number | null
  kerenHishtalmutEmployer: number | null
  severanceEmployer: number | null
  totalDeductions: number | null
  totalEmployerCost: number | null
  entries: PayslipEntry[]
}

// ===== Analysis Types =====

export type FindingCategory =
  | 'base_pay' | 'overtime' | 'global_overtime' | 'commission' | 'bonus'
  | 'travel' | 'meals' | 'phone' | 'pension_employee' | 'pension_employer'
  | 'keren_hishtalmut' | 'severance' | 'income_tax' | 'national_insurance'
  | 'health_insurance' | 'sick_days' | 'vacation' | 'amendment24'
  | 'minimum_wage' | 'recuperation' | 'other'

export type GapDirection = 'underpaid' | 'overpaid' | 'match' | 'missing_from_payslip' | 'not_in_contract'

export type Severity = 'critical' | 'warning' | 'info'

export interface AnalysisFinding {
  category: FindingCategory
  fieldName: string
  contractValue: number | null
  payslipValue: number | null
  gap: number
  gapDirection: GapDirection
  severity: Severity
  legalReference: string | null
  explanation: string
}

export interface DiffSummary {
  totalFindings: number
  critical: number
  warning: number
  info: number
  totalGapAmount: number
}

export interface OvertimeAnalysis {
  model: 'standard' | 'global' | 'none'
  expectedPay: number
  actualPay: number
  gap: number
  effectiveHourlyRate: number
}

export interface TaxAnalysis {
  expectedTax: number
  actualTax: number
  overcharge: number
  creditPoints: number
  creditPointsValue: number
  regionalBenefitValue: number
}

export interface DiffResult {
  findings: AnalysisFinding[]
  summary: DiffSummary
  overtimeAnalysis: OvertimeAnalysis
  taxAnalysis: TaxAnalysis
}

// ===== Analysis Run Status =====

export type AnalysisStatus =
  | 'contract_parse_failed'
  | 'payslip_parse_failed'
  | 'missing_profile_data'
  | 'pending_user_verification'
  | 'ready_to_analyze'
  | 'analyzed'
  | 'letter_generated'
