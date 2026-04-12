// Minimum wage data per year — Israeli law
export const MINIMUM_WAGE: Record<number, {
  monthly: number
  hourly: number
  daily5: number
  daily6: number
}> = {
  2022: { monthly: 5_300, hourly: 29.12, daily5: 244.62, daily6: 212 },
  2023: { monthly: 5_571.75, hourly: 30.61, daily5: 257.09, daily6: 222.87 },
  2024: { monthly: 5_571.75, hourly: 30.61, daily5: 257.09, daily6: 222.87 },
  2025: { monthly: 5_880.02, hourly: 32.30, daily5: 271.39, daily6: 235.20 },
  2026: { monthly: 6_000, hourly: 32.96, daily5: 276.92, daily6: 240 },
}
