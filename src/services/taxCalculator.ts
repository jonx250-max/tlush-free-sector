import type { Settlement } from '../data/settlements'
import { CREDIT_POINT_VALUES } from './tax/values'
import { calculateCreditPoints } from './tax/creditPoints'

// ============================================================
// Israeli Income Tax Calculator — Multi-Year (2022-2026)
// ============================================================

export interface TaxBracket {
  limit: number
  rate: number
}

export interface CreditPointsInput {
  gender: 'male' | 'female'
  childrenBirthYears: number[]
  academicDegree: 'none' | 'ba' | 'ma' | 'phd'
  degreeCompletionYear: number | null
  militaryService: {
    served: boolean
    dischargeYear: number | null
    monthsServed: number
    isCombat: boolean
  }
  isNewImmigrant: boolean
  immigrationDate: string | null
  disabilityPercentage: number
  isSingleParent: boolean
  reservistDays2026: number
}

export interface CreditPointsResult {
  totalPoints: number
  breakdown: { reason: string; points: number }[]
  monthlyValue: number
}

export interface RegionalTaxBenefit {
  extraCreditPoints: number
  creditPointsValue: number
  taxDiscountPct: number
  taxDiscountAmount: number
  incomeExemption: number
  totalBenefit: number
}

export interface TaxResult {
  grossMonthly: number
  taxBeforeCredits: number
  creditPoints: CreditPointsResult
  regionalBenefit: RegionalTaxBenefit | null
  taxAfterCredits: number
  effectiveTaxRate: number
}

// --- Tax brackets per year ---
const TAX_BRACKETS: Record<number, TaxBracket[]> = {
  2022: [
    { limit: 6_450, rate: 0.10 },
    { limit: 9_240, rate: 0.14 },
    { limit: 14_840, rate: 0.20 },
    { limit: 20_620, rate: 0.31 },
    { limit: 42_910, rate: 0.35 },
    { limit: 55_270, rate: 0.47 },
    { limit: Infinity, rate: 0.50 },
  ],
  2023: [
    { limit: 6_790, rate: 0.10 },
    { limit: 9_730, rate: 0.14 },
    { limit: 15_620, rate: 0.20 },
    { limit: 21_710, rate: 0.31 },
    { limit: 45_180, rate: 0.35 },
    { limit: 58_190, rate: 0.47 },
    { limit: Infinity, rate: 0.50 },
  ],
  2024: [
    { limit: 6_790, rate: 0.10 },
    { limit: 9_730, rate: 0.14 },
    { limit: 15_620, rate: 0.20 },
    { limit: 21_710, rate: 0.31 },
    { limit: 45_180, rate: 0.35 },
    { limit: 58_190, rate: 0.47 },
    { limit: Infinity, rate: 0.50 },
  ],
  2025: [
    { limit: 7_010, rate: 0.10 },
    { limit: 10_060, rate: 0.14 },
    { limit: 16_150, rate: 0.20 },
    { limit: 22_440, rate: 0.31 },
    { limit: 46_690, rate: 0.35 },
    { limit: 60_130, rate: 0.47 },
    { limit: Infinity, rate: 0.50 },
  ],
  2026: [
    { limit: 7_010, rate: 0.10 },
    { limit: 10_060, rate: 0.14 },
    { limit: 19_000, rate: 0.20 },
    { limit: 25_100, rate: 0.31 },
    { limit: 42_400, rate: 0.35 },
    { limit: 60_130, rate: 0.47 },
    { limit: Infinity, rate: 0.50 },
  ],
}

// Eilat income exemption ceiling (annual)
const EILAT_EXEMPTION_CEILING = 262_320

// --- Core: Progressive tax calculation ---
export function calculateIncomeTax(monthlyGross: number, year: number): number {
  const brackets = TAX_BRACKETS[year]
  if (!brackets) throw new Error(`No tax brackets for year ${year}`)
  if (monthlyGross <= 0) return 0

  let tax = 0
  let prev = 0

  for (const bracket of brackets) {
    if (monthlyGross <= prev) break
    const taxable = Math.min(monthlyGross, bracket.limit) - prev
    if (taxable > 0) {
      tax += taxable * bracket.rate
    }
    prev = bracket.limit
  }

  return Math.round(tax * 100) / 100
}

export { calculateCreditPoints }

// --- Regional tax benefits ---
export function calculateRegionalBenefit(
  settlement: Settlement,
  monthlyGross: number,
  year: number,
): RegionalTaxBenefit {
  if (settlement.zone === 'none') {
    return {
      extraCreditPoints: 0,
      creditPointsValue: 0,
      taxDiscountPct: 0,
      taxDiscountAmount: 0,
      incomeExemption: 0,
      totalBenefit: 0,
    }
  }

  const pointValue = CREDIT_POINT_VALUES[year] ?? CREDIT_POINT_VALUES[2026]
  const creditPointsValue = Math.round(settlement.creditPoints * pointValue * 100) / 100

  // Tax discount (applied to calculated tax, capped at annual max / 12)
  const monthlyTax = calculateIncomeTax(monthlyGross, year)
  const maxMonthlyDiscount = settlement.maxDiscountAnnual / 12
  const taxDiscountAmount = Math.min(
    Math.round(monthlyTax * (settlement.taxDiscountPct / 100) * 100) / 100,
    maxMonthlyDiscount,
  )

  // Eilat special: 10% income exemption
  let incomeExemption = 0
  if (settlement.zone === 'eilat') {
    const annualGross = monthlyGross * 12
    incomeExemption = Math.round(
      (Math.min(annualGross, EILAT_EXEMPTION_CEILING) * 0.10) / 12 * 100,
    ) / 100
  }

  return {
    extraCreditPoints: settlement.creditPoints,
    creditPointsValue,
    taxDiscountPct: settlement.taxDiscountPct,
    taxDiscountAmount,
    incomeExemption,
    totalBenefit: creditPointsValue + taxDiscountAmount + incomeExemption,
  }
}

// --- Full tax calculation ---
export function calculateFullTax(
  monthlyGross: number,
  creditInput: CreditPointsInput,
  settlement: Settlement | null,
  year: number,
): TaxResult {
  const taxBeforeCredits = calculateIncomeTax(monthlyGross, year)
  const creditPoints = calculateCreditPoints(creditInput, year)

  let regionalBenefit: RegionalTaxBenefit | null = null
  if (settlement) {
    regionalBenefit = calculateRegionalBenefit(settlement, monthlyGross, year)
  }

  const totalCredits = creditPoints.monthlyValue
    + (regionalBenefit?.creditPointsValue ?? 0)
    + (regionalBenefit?.taxDiscountAmount ?? 0)
    + (regionalBenefit?.incomeExemption ?? 0)

  const taxAfterCredits = Math.max(0, taxBeforeCredits - totalCredits)
  const effectiveTaxRate = monthlyGross > 0
    ? Math.round((taxAfterCredits / monthlyGross) * 10000) / 100
    : 0

  return {
    grossMonthly: monthlyGross,
    taxBeforeCredits,
    creditPoints,
    regionalBenefit,
    taxAfterCredits,
    effectiveTaxRate,
  }
}

export { CREDIT_POINT_VALUES, TAX_BRACKETS }
