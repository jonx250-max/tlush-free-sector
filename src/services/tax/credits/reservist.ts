import type { CreditRule } from './types'

const TIERS_2026 = [
  { minDays: 30, maxDays: 39, points: 0.5 },
  { minDays: 40, maxDays: 49, points: 0.75 },
  { minDays: 50, maxDays: 54, points: 1.0 },
  { minDays: 55, maxDays: 69, points: 1.5 },
  { minDays: 70, maxDays: 84, points: 2.0 },
  { minDays: 85, maxDays: 109, points: 3.0 },
  { minDays: 110, maxDays: Infinity, points: 4.0 },
]

export const reservist: CreditRule = (input, year) => {
  if (year < 2026 || input.reservistDays2026 < 30) return []
  const tier = TIERS_2026.find(
    t => input.reservistDays2026 >= t.minDays && input.reservistDays2026 <= t.maxDays,
  )
  if (!tier) return []
  return [{ reason: `מילואימניק לוחם (${input.reservistDays2026} ימים)`, points: tier.points }]
}
