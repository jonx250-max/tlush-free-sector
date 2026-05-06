/**
 * Stage E1 — Law-version registry.
 *
 * Loads the JSON fixture for each supported tax year and exposes a
 * single typed accessor `getLawSet(year)`. Calculators consume this
 * instead of branching on `year` internally.
 *
 * Stage E2 — fallback: if a caller asks for a year not present
 * (e.g. 2027 before the new tables ship), we return the most-recent
 * supported year's data with `actualYear !== requestedYear` and
 * `isProvisional: true` so callers can warn the user.
 *
 * Every leaf value carries a `provisional` flag. Verification protocol
 * lives in `docs/STAGE_E_INPUTS.md`. UI surfaces this flag on findings.
 */

import LAW_2022 from '../../data/laws/2022/law-set.json'
import LAW_2023 from '../../data/laws/2023/law-set.json'
import LAW_2024 from '../../data/laws/2024/law-set.json'
import LAW_2025 from '../../data/laws/2025/law-set.json'
import LAW_2026 from '../../data/laws/2026/law-set.json'

export interface TaxBracket {
  /** Upper bound of the bracket, inclusive (monthly NIS). null = top bracket (no cap). */
  limitMonthly: number | null
  rate: number
}

export interface MinimumWage {
  monthlyNis: number
  hourlyNis: number
  provisional: boolean
}

export interface PensionMandatory {
  employeePct: number
  employerPct: number
  severancePct: number
  provisional: boolean
}

export interface ContributionBands {
  reducedRateCeilingMonthly: number
  reducedRatePct: number
  fullRateCeilingMonthly: number
  fullRatePct: number
  provisional: boolean
}

export interface MaternityRules {
  niiDailyCapNis: number
  provisional: boolean
}

export interface RecreationPay {
  dailyRateNis: number
  scheduleByYearsService: { minYearsOfService: number; days: number }[]
  provisional: boolean
}

export interface ReservistRules {
  statutoryMinimumDailyPayNis: number
  averagingDivisor: number
  topUpRule: string
  lawSection: string
  provisional: boolean
}

export interface LawSet {
  year: number
  /** Year actually used (may differ from requested if fallback engaged). */
  actualYear: number
  /** True if any leaf flag is provisional OR fallback engaged. */
  isProvisional: boolean
  taxBrackets: TaxBracket[]
  creditPointValueMonthly: number
  minimumWage: MinimumWage
  pensionMandatory: PensionMandatory
  nationalInsurance: ContributionBands
  masBriut: ContributionBands
  maternity: MaternityRules
  recreationPay: RecreationPay
  reservist: ReservistRules
}

const LAW_BY_YEAR: Record<number, unknown> = {
  2022: LAW_2022,
  2023: LAW_2023,
  2024: LAW_2024,
  2025: LAW_2025,
  2026: LAW_2026,
}

export const SUPPORTED_LAW_YEARS = Object.keys(LAW_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b)

const MOST_RECENT_YEAR = SUPPORTED_LAW_YEARS[SUPPORTED_LAW_YEARS.length - 1]

function isProvisionalDeep(set: LawSet): boolean {
  return (
    set.minimumWage.provisional
    || set.pensionMandatory.provisional
    || set.nationalInsurance.provisional
    || set.masBriut.provisional
    || set.maternity.provisional
    || set.recreationPay.provisional
    || set.reservist.provisional
  )
}

function buildLawSet(raw: unknown, requestedYear: number, actualYear: number): LawSet {
  const r = raw as LawSet
  const set: LawSet = {
    ...r,
    year: requestedYear,
    actualYear,
    isProvisional: false,
  }
  set.isProvisional = (requestedYear !== actualYear) || isProvisionalDeep(set)
  return set
}

/**
 * Returns the law set for a requested tax year. If the year is not
 * present in `data/laws/<year>/`, falls back to the most recent year
 * with `actualYear !== requestedYear` so the caller can warn the user.
 *
 * Throws only if no law sets are loaded at all (compile-time impossible
 * given the static imports above).
 */
export function getLawSet(requestedYear: number): LawSet {
  const exact = LAW_BY_YEAR[requestedYear]
  if (exact) return buildLawSet(exact, requestedYear, requestedYear)

  // Fallback: most-recent supported year.
  const fallback = LAW_BY_YEAR[MOST_RECENT_YEAR]
  return buildLawSet(fallback, requestedYear, MOST_RECENT_YEAR)
}

/**
 * Helper for UI / findings: a one-line label describing the
 * provisional state of a law set.
 */
export function describeProvisional(set: LawSet): string | null {
  if (set.actualYear !== set.year) {
    return `שנת ${set.year} לא נתמכת — חישוב לפי טבלת ${set.actualYear} (זמני)`
  }
  if (set.isProvisional) {
    return 'חלק מערכי החוק טרם אומתו ידנית — ראה דוח'
  }
  return null
}
