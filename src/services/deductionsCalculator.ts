// ============================================================
// Israeli Deductions Calculator — NI, Health, Pension, Keren Hishtalmut
// Multi-Year (2022-2026)
// ============================================================

export interface NIRates {
  threshold: number
  reducedEmployee: number
  fullEmployee: number
  healthReduced: number
  healthFull: number
  reducedEmployer: number
  fullEmployer: number
}

export interface PensionConfig {
  employeeRate: number   // e.g. 0.06 for 6%
  employerRate: number   // e.g. 0.065 for 6.5%
  severanceRate: number  // e.g. 0.0833 for 8.33%
}

export interface KerenConfig {
  employeeRate: number   // e.g. 0.025 for 2.5%
  employerRate: number   // e.g. 0.075 for 7.5%
}

export interface DeductionsResult {
  nationalInsurance: number
  healthInsurance: number
  pensionEmployee: number
  pensionEmployer: number
  severanceEmployer: number
  kerenEmployee: number
  kerenEmployer: number
  totalEmployeeDeductions: number
  totalEmployerContributions: number
}

// NI rates per year (employee side)
const NI_RATES: Record<number, NIRates> = {
  2022: { threshold: 6_331, reducedEmployee: 0.004, fullEmployee: 0.07, healthReduced: 0.031, healthFull: 0.05, reducedEmployer: 0.0345, fullEmployer: 0.0675 },
  2023: { threshold: 6_331, reducedEmployee: 0.004, fullEmployee: 0.07, healthReduced: 0.031, healthFull: 0.05, reducedEmployer: 0.0345, fullEmployer: 0.0675 },
  2024: { threshold: 6_331, reducedEmployee: 0.004, fullEmployee: 0.07, healthReduced: 0.031, healthFull: 0.05, reducedEmployer: 0.0345, fullEmployer: 0.0675 },
  2025: { threshold: 7_122, reducedEmployee: 0.004, fullEmployee: 0.07, healthReduced: 0.031, healthFull: 0.05, reducedEmployer: 0.0345, fullEmployer: 0.0675 },
  2026: { threshold: 7_122, reducedEmployee: 0.004, fullEmployee: 0.07, healthReduced: 0.031, healthFull: 0.05, reducedEmployer: 0.0345, fullEmployer: 0.0675 },
}

// Default private sector pension rates (legal minimum since 2017)
export const DEFAULT_PENSION: PensionConfig = {
  employeeRate: 0.06,
  employerRate: 0.065,
  severanceRate: 0.0833,
}

export const DEFAULT_KEREN: KerenConfig = {
  employeeRate: 0.025,
  employerRate: 0.075,
}

export function calculateNationalInsurance(monthlyGross: number, year: number): number {
  const rates = NI_RATES[year]
  if (!rates) throw new Error(`No NI rates for year ${year}`)
  if (monthlyGross <= 0) return 0

  const belowThreshold = Math.min(monthlyGross, rates.threshold)
  const aboveThreshold = Math.max(0, monthlyGross - rates.threshold)

  return round(belowThreshold * rates.reducedEmployee + aboveThreshold * rates.fullEmployee)
}

export function calculateHealthInsurance(monthlyGross: number, year: number): number {
  const rates = NI_RATES[year]
  if (!rates) throw new Error(`No NI rates for year ${year}`)
  if (monthlyGross <= 0) return 0

  const belowThreshold = Math.min(monthlyGross, rates.threshold)
  const aboveThreshold = Math.max(0, monthlyGross - rates.threshold)

  return round(belowThreshold * rates.healthReduced + aboveThreshold * rates.healthFull)
}

export function calculateEmployerNI(monthlyGross: number, year: number): number {
  const rates = NI_RATES[year]
  if (!rates) throw new Error(`No NI rates for year ${year}`)
  if (monthlyGross <= 0) return 0

  const belowThreshold = Math.min(monthlyGross, rates.threshold)
  const aboveThreshold = Math.max(0, monthlyGross - rates.threshold)

  return round(belowThreshold * rates.reducedEmployer + aboveThreshold * rates.fullEmployer)
}

export function calculatePension(
  pensionBase: number,
  config: PensionConfig = DEFAULT_PENSION,
): { employee: number; employer: number; severance: number } {
  return {
    employee: round(pensionBase * config.employeeRate),
    employer: round(pensionBase * config.employerRate),
    severance: round(pensionBase * config.severanceRate),
  }
}

export function calculateKerenHistahlmut(
  base: number,
  config: KerenConfig = DEFAULT_KEREN,
): { employee: number; employer: number } {
  return {
    employee: round(base * config.employeeRate),
    employer: round(base * config.employerRate),
  }
}

/**
 * Calculate all deductions for a given gross salary.
 * pensionBase = gross + commissions (commissions MUST be included per law)
 */
export function calculateAllDeductions(
  monthlyGross: number,
  year: number,
  pensionBase: number,
  pension: PensionConfig = DEFAULT_PENSION,
  keren: KerenConfig | null = DEFAULT_KEREN,
): DeductionsResult {
  const ni = calculateNationalInsurance(monthlyGross, year)
  const health = calculateHealthInsurance(monthlyGross, year)
  const pensionResult = calculatePension(pensionBase, pension)
  const kerenResult = keren
    ? calculateKerenHistahlmut(pensionBase, keren)
    : { employee: 0, employer: 0 }

  return {
    nationalInsurance: ni,
    healthInsurance: health,
    pensionEmployee: pensionResult.employee,
    pensionEmployer: pensionResult.employer,
    severanceEmployer: pensionResult.severance,
    kerenEmployee: kerenResult.employee,
    kerenEmployer: kerenResult.employer,
    totalEmployeeDeductions: ni + health + pensionResult.employee + kerenResult.employee,
    totalEmployerContributions: pensionResult.employer + pensionResult.severance + kerenResult.employer,
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
