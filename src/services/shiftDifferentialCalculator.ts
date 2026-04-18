// SOURCE: חוק שעות עבודה ומנוחה — תוספת ערב/לילה
// משמרת לילה (22:00–06:00): 7 שעות ספירה כ-8. תוספת ערב נפוצה 25%, לילה 50%.

export interface ShiftDifferentialInput {
  eveningShiftHours: number
  nightShiftHours: number
  hourlyRate: number
  payslipShiftDifferential: number | null
  eveningPremiumPct: number
  nightPremiumPct: number
}

export interface ShiftDifferentialResult {
  expectedDifferential: number
  actualDifferential: number
  shortfall: number
  hasShifts: boolean
}

export function calculateShiftDifferential(input: ShiftDifferentialInput): ShiftDifferentialResult {
  const hasShifts = input.eveningShiftHours > 0 || input.nightShiftHours > 0
  if (!hasShifts) {
    return { expectedDifferential: 0, actualDifferential: 0, shortfall: 0, hasShifts: false }
  }
  const evening = input.eveningShiftHours * input.hourlyRate * (input.eveningPremiumPct / 100)
  const night = input.nightShiftHours * input.hourlyRate * (input.nightPremiumPct / 100)
  const expected = round2(evening + night)
  const actual = input.payslipShiftDifferential ?? 0
  const shortfall = Math.max(0, round2(expected - actual))
  return { expectedDifferential: expected, actualDifferential: actual, shortfall, hasShifts: true }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
