// ============================================================
// Vacation & Sick Day Calculator
// חוק חופשה שנתית + חוק דמי מחלה
// ============================================================

// Vacation days by years of service (5-day work week)
const VACATION_DAYS_5DAY: Record<number, number> = {
  1: 12, 2: 12, 3: 12, 4: 12,
  5: 16, 6: 18, 7: 20,
  8: 21, 9: 22, 10: 23, 11: 24, 12: 25, 13: 26, 14: 28,
}

// 6-day week gets slightly different calculation
const VACATION_DAYS_6DAY: Record<number, number> = {
  1: 14, 2: 14, 3: 14, 4: 14,
  5: 18, 6: 21, 7: 24,
  8: 24, 9: 25, 10: 26, 11: 27, 12: 28, 13: 29, 14: 30,
}

// Sick pay: 1.5 days per month, max 90 accumulated
const SICK_DAYS_PER_MONTH = 1.5
const SICK_DAYS_MAX = 90

// Sick pay rates by day
const SICK_PAY_RATES = [
  { fromDay: 1, toDay: 1, rate: 0 },     // Day 1: no pay
  { fromDay: 2, toDay: 3, rate: 0.5 },   // Days 2-3: 50%
  { fromDay: 4, toDay: Infinity, rate: 1.0 }, // Day 4+: 100%
]

export function calculateVacationDays(
  yearsOfService: number,
  workDaysPerWeek: 5 | 6,
): number {
  const table = workDaysPerWeek === 5 ? VACATION_DAYS_5DAY : VACATION_DAYS_6DAY
  const year = Math.max(1, Math.min(yearsOfService, 14))
  return table[year] ?? table[14]
}

export function calculateAccumulatedSickDays(monthsOfService: number): number {
  return Math.min(monthsOfService * SICK_DAYS_PER_MONTH, SICK_DAYS_MAX)
}

export function calculateSickPay(
  dailyWage: number,
  sickDays: number,
): number {
  let total = 0
  for (let day = 1; day <= sickDays; day++) {
    const rate = SICK_PAY_RATES.find(r => day >= r.fromDay && day <= r.toDay)
    if (rate) {
      total += dailyWage * rate.rate
    }
  }
  return Math.round(total * 100) / 100
}

