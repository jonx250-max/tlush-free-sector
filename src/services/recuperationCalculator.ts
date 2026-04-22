// ============================================================
// Recuperation Pay Calculator — דמי הבראה
// צו הרחבה בדבר תשלום דמי הבראה
// ============================================================

// Value per recuperation day, per year
const RECUPERATION_DAY_VALUE: Record<number, number> = {
  2022: 378,
  2023: 418,
  2024: 418,
  2025: 431,
  2026: 440,
}

// Recuperation days by seniority (private sector)
const RECUPERATION_DAYS: Record<number, number> = {
  1: 5,
  2: 6, 3: 6,
  4: 7, 5: 7, 6: 7, 7: 7, 8: 7, 9: 7, 10: 7,
  11: 8, 12: 8, 13: 8, 14: 8, 15: 8,
  16: 9, 17: 9, 18: 9, 19: 9,
  20: 10,
}

export function getRecuperationDays(yearsOfService: number): number {
  const year = Math.max(1, Math.min(yearsOfService, 20))
  return RECUPERATION_DAYS[year] ?? RECUPERATION_DAYS[20]
}

function getRecuperationDayValue(year: number): number {
  return RECUPERATION_DAY_VALUE[year] ?? RECUPERATION_DAY_VALUE[2026]
}

export function calculateAnnualRecuperation(
  yearsOfService: number,
  year: number,
): number {
  const days = getRecuperationDays(yearsOfService)
  const value = getRecuperationDayValue(year)
  return days * value
}

export function calculateMonthlyRecuperation(
  yearsOfService: number,
  year: number,
): number {
  return Math.round(calculateAnnualRecuperation(yearsOfService, year) / 12 * 100) / 100
}
