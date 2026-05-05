import type { Settlement } from '../data/settlements'
import { CREDIT_POINT_VALUES } from './tax/values'
import { calculateCreditPoints } from './tax/creditPoints'
import { getLawSet } from './lawVersion'

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

// Eilat income exemption ceiling (annual)
const EILAT_EXEMPTION_CEILING = 262_320

/**
 * Stage E18 — bracket data sourced from `getLawSet(year)`. The legacy
 * `TAX_BRACKETS` constant is gone; year-version selection + 2027+
 * fallback live in `lawVersion.ts`.
 *
 * Throws only if the static law-set imports are missing entirely
 * (compile-time impossible).
 */
export function calculateIncomeTax(monthlyGross: number, year: number): number {
  const brackets = getLawSet(year).taxBrackets
  if (monthlyGross <= 0) return 0

  let tax = 0
  let prev = 0

  for (const bracket of brackets) {
    if (monthlyGross <= prev) break
    const limit = bracket.limitMonthly ?? Number.POSITIVE_INFINITY
    const taxable = Math.min(monthlyGross, limit) - prev
    if (taxable > 0) {
      tax += taxable * bracket.rate
    }
    prev = limit
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
