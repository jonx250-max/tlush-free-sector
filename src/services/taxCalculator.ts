import type { Settlement } from '../data/settlements'

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

// --- Credit point monetary value per year ---
const CREDIT_POINT_VALUES: Record<number, number> = {
  2022: 223,
  2023: 235,
  2024: 242,
  2025: 242,
  2026: 242,
}

// Combat reservist tiers (2026+)
const RESERVIST_TIERS_2026 = [
  { minDays: 30, maxDays: 39, points: 0.5 },
  { minDays: 40, maxDays: 49, points: 0.75 },
  { minDays: 50, maxDays: 54, points: 1.0 },
  { minDays: 55, maxDays: 69, points: 1.5 },
  { minDays: 70, maxDays: 84, points: 2.0 },
  { minDays: 85, maxDays: 109, points: 3.0 },
  { minDays: 110, maxDays: Infinity, points: 4.0 },
]

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

// --- Credit points calculation ---
export function calculateCreditPoints(
  input: CreditPointsInput,
  year: number,
): CreditPointsResult {
  const breakdown: { reason: string; points: number }[] = []

  // Base: every resident gets 2.25 (male) or 2.75 (female)
  const base = input.gender === 'female' ? 2.75 : 2.25
  breakdown.push({ reason: 'תושב/ת', points: base })

  // Children credit points
  for (const birthYear of input.childrenBirthYears) {
    const age = year - birthYear
    if (age >= 0 && age <= 5) {
      breakdown.push({ reason: `ילד/ה גיל ${age}`, points: 2.5 })
    } else if (age >= 6 && age <= 17) {
      breakdown.push({ reason: `ילד/ה גיל ${age}`, points: 1.0 })
    } else if (age === 18) {
      breakdown.push({ reason: `ילד/ה גיל 18`, points: 0.5 })
    }
  }

  // Single parent
  if (input.isSingleParent) {
    breakdown.push({ reason: 'הורה יחיד/נית', points: 1.0 })
  }

  // Academic degree
  if (input.academicDegree === 'ba' && input.degreeCompletionYear) {
    const yearsSince = year - input.degreeCompletionYear
    if (yearsSince >= 0 && yearsSince <= 2) {
      breakdown.push({ reason: 'תואר ראשון', points: 1.0 })
    }
  } else if (input.academicDegree === 'ma' && input.degreeCompletionYear) {
    const yearsSince = year - input.degreeCompletionYear
    if (yearsSince >= 0 && yearsSince <= 2) {
      breakdown.push({ reason: 'תואר שני', points: 0.5 })
    }
  } else if (input.academicDegree === 'phd' && input.degreeCompletionYear) {
    const yearsSince = year - input.degreeCompletionYear
    if (yearsSince >= 0 && yearsSince <= 2) {
      breakdown.push({ reason: 'דוקטורט', points: 1.0 })
    }
  }

  // Military service — 2 years after discharge
  if (input.militaryService.served && input.militaryService.dischargeYear) {
    const yearsSince = year - input.militaryService.dischargeYear
    if (yearsSince >= 0 && yearsSince <= 2) {
      if (input.militaryService.monthsServed >= 23 || input.militaryService.isCombat) {
        breakdown.push({ reason: 'שירות צבאי', points: 2.0 })
      } else if (input.militaryService.monthsServed >= 12) {
        breakdown.push({ reason: 'שירות צבאי', points: 1.0 })
      }
    }
  }

  // Combat reservist (2026 rule)
  if (year >= 2026 && input.reservistDays2026 >= 30) {
    const tier = RESERVIST_TIERS_2026.find(
      t => input.reservistDays2026 >= t.minDays && input.reservistDays2026 <= t.maxDays,
    )
    if (tier) {
      breakdown.push({ reason: `מילואימניק לוחם (${input.reservistDays2026} ימים)`, points: tier.points })
    }
  }

  // Disability
  if (input.disabilityPercentage >= 100) {
    breakdown.push({ reason: 'נכות 100%', points: 2.0 })
  } else if (input.disabilityPercentage >= 90) {
    breakdown.push({ reason: `נכות ${input.disabilityPercentage}%`, points: 1.5 })
  }

  // New immigrant — full exemption for 18 months, then partial
  if (input.isNewImmigrant && input.immigrationDate) {
    const immigrationYear = new Date(input.immigrationDate).getFullYear()
    const yearsSince = year - immigrationYear
    if (yearsSince <= 1) {
      breakdown.push({ reason: 'עולה חדש/ה — שנה ראשונה', points: 4.5 })
    } else if (yearsSince === 2) {
      breakdown.push({ reason: 'עולה חדש/ה — שנה שנייה', points: 3.0 })
    } else if (yearsSince === 3) {
      breakdown.push({ reason: 'עולה חדש/ה — שנה שלישית', points: 2.0 })
    }
  }

  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0)
  const pointValue = CREDIT_POINT_VALUES[year] ?? CREDIT_POINT_VALUES[2026]
  const monthlyValue = Math.round(totalPoints * pointValue * 100) / 100

  return { totalPoints, breakdown, monthlyValue }
}

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
