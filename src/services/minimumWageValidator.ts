// ============================================================
// Minimum Wage Validator
// חוק שכר מינימום, התשמ"ז-1987
// ============================================================

import { MINIMUM_WAGE } from '../data/minimumWage'

export interface MinimumWageResult {
  isAboveMinimum: boolean
  minimumWage: number
  actualPay: number
  shortfall: number
  effectiveHourlyRate: number
  minimumHourlyRate: number
}

export function validateMinimumWage(
  monthlyGross: number,
  year: number,
  workDaysPerWeek: 5 | 6 = 5,
): MinimumWageResult {
  const min = MINIMUM_WAGE[year]
  if (!min) throw new Error(`No minimum wage data for year ${year}`)

  const isAboveMinimum = monthlyGross >= min.monthly
  const shortfall = isAboveMinimum ? 0 : Math.round((min.monthly - monthlyGross) * 100) / 100

  // Approximate hourly rate assuming standard hours
  const standardHours = workDaysPerWeek === 5 ? 182 : 186
  const effectiveHourlyRate = Math.round((monthlyGross / standardHours) * 100) / 100

  return {
    isAboveMinimum,
    minimumWage: min.monthly,
    actualPay: monthlyGross,
    shortfall,
    effectiveHourlyRate,
    minimumHourlyRate: min.hourly,
  }
}

export function validateHourlyMinimum(
  hourlyRate: number,
  year: number,
): { isAboveMinimum: boolean; shortfall: number } {
  const min = MINIMUM_WAGE[year]
  if (!min) throw new Error(`No minimum wage data for year ${year}`)

  return {
    isAboveMinimum: hourlyRate >= min.hourly,
    shortfall: hourlyRate >= min.hourly ? 0 : Math.round((min.hourly - hourlyRate) * 100) / 100,
  }
}
