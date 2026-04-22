// SOURCE: חוק פיצויי פיטורים תשכ"ג-1963, סעיפים 1, 12
// פיצויים = שכר חודש אחרון × שנות עבודה. קצובת פטור עד תקרה (טופס 161).

import { round2 } from '../lib/numbers'

export interface SeveranceInput {
  lastMonthlyGross: number
  startDate: string | null
  terminationDate: string | null
  pensionSeveranceAccrued: number
  isTerminatedByEmployer: boolean
}

export interface SeveranceResult {
  yearsOfService: number
  monthsOfService: number
  expectedSeverance: number
  alreadyAccrued: number
  shortfall: number
  form161TaxFreeCeiling: number
  form161Taxable: number
  isEligible: boolean
}

const TAX_FREE_CEILING_PER_YEAR = 13_750

export function calculateSeverance(input: SeveranceInput): SeveranceResult {
  if (!input.startDate || !input.terminationDate) {
    return zero()
  }
  const start = new Date(input.startDate)
  const end = new Date(input.terminationDate)
  const months = Math.max(0, monthsBetween(start, end))
  const years = months / 12

  if (years < 1 || !input.isTerminatedByEmployer) {
    return { ...zero(), yearsOfService: years, monthsOfService: months }
  }

  const expected = round2(input.lastMonthlyGross * years)
  const accrued = input.pensionSeveranceAccrued
  const shortfall = Math.max(0, round2(expected - accrued))

  const ceiling = round2(TAX_FREE_CEILING_PER_YEAR * years)
  const taxable = Math.max(0, round2(expected - ceiling))

  return {
    yearsOfService: round2(years),
    monthsOfService: months,
    expectedSeverance: expected,
    alreadyAccrued: accrued,
    shortfall,
    form161TaxFreeCeiling: ceiling,
    form161Taxable: taxable,
    isEligible: true,
  }
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function zero(): SeveranceResult {
  return {
    yearsOfService: 0,
    monthsOfService: 0,
    expectedSeverance: 0,
    alreadyAccrued: 0,
    shortfall: 0,
    form161TaxFreeCeiling: 0,
    form161Taxable: 0,
    isEligible: false,
  }
}
