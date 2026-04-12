// ============================================================
// Israeli Overtime Calculator
// חוק שעות עבודה ומנוחה, התשי"א-1951
// ============================================================

export interface OvertimeContext {
  baseSalary: number
  commissions: number
  workDaysPerWeek: 5 | 6
  totalHoursWorked: number
  overtimeHours125: number  // hours at 125%
  overtimeHours150: number  // hours at 150%
  nightShiftHours: number   // night shift (7h day)
  shabbatHours: number      // shabbat/holiday hours
}

export interface OvertimeResult {
  standardMonthlyHours: number
  effectiveHourlyRate: number
  overtime125Pay: number
  overtime150Pay: number
  nightShiftAdjustment: number
  shabbatPay: number
  totalOvertimePay: number
  expectedMinimumOvertimePay: number
}

/**
 * Standard monthly hours by work week configuration.
 * 5-day week: 42h/week × 52/12 ≈ 182h
 * 6-day week: 42h/week × 52/12 ≈ 186h (historical, some still use)
 */
export function getStandardMonthlyHours(workDaysPerWeek: 5 | 6): number {
  return workDaysPerWeek === 5 ? 182 : 186
}

/**
 * Effective hourly rate = (baseSalary + commissions) / standardHours
 * Commissions MUST be included in base for overtime calculation per case law.
 */
export function calculateEffectiveHourlyRate(
  baseSalary: number,
  commissions: number,
  workDaysPerWeek: 5 | 6,
): number {
  const hours = getStandardMonthlyHours(workDaysPerWeek)
  return (baseSalary + commissions) / hours
}

export function calculateOvertime(context: OvertimeContext): OvertimeResult {
  const standardHours = getStandardMonthlyHours(context.workDaysPerWeek)
  const effectiveBase = context.baseSalary + context.commissions
  const hourlyRate = effectiveBase / standardHours

  // Standard overtime: 125% for first 2 hours, 150% from 3rd hour
  const overtime125Pay = round(context.overtimeHours125 * hourlyRate * 1.25)
  const overtime150Pay = round(context.overtimeHours150 * hourlyRate * 1.50)

  // Night shift: 7-hour day counts as 8. Extra hours beyond 7 = overtime.
  // Adjustment = hours * hourlyRate * 0.25 (the extra 25% on top of base)
  const nightShiftAdjustment = round(context.nightShiftHours * hourlyRate * 0.25)

  // Shabbat/holiday: base rate = 150%. Overtime on shabbat = 175% / 200%
  // For simplicity, shabbat hours get 150% of hourly rate
  const shabbatPay = round(context.shabbatHours * hourlyRate * 1.50)

  const totalOvertimePay = overtime125Pay + overtime150Pay + nightShiftAdjustment + shabbatPay

  // Minimum expected overtime if hours exceed standard
  const excessHours = Math.max(0, context.totalHoursWorked - standardHours)
  const expectedMinimumOvertimePay = excessHours > 0
    ? round(Math.min(excessHours, 2 * 22) * hourlyRate * 1.25) // rough minimum
    : 0

  return {
    standardMonthlyHours: standardHours,
    effectiveHourlyRate: round(hourlyRate),
    overtime125Pay,
    overtime150Pay,
    nightShiftAdjustment,
    shabbatPay,
    totalOvertimePay,
    expectedMinimumOvertimePay,
  }
}

/**
 * Validate global overtime model (Amendment 24).
 * If contract says "global salary includes X overtime hours":
 * 1. Payslip MUST show base and overtime separately
 * 2. Overtime hours paid must match or exceed contract hours
 * 3. Rate must be at least 125%/150% of effective hourly
 */
export function validateGlobalOvertime(
  contractGlobalHours: number,
  contractGlobalAmount: number,
  baseSalary: number,
  commissions: number,
  workDaysPerWeek: 5 | 6,
): {
  minimumOvertimePay: number
  isAmountSufficient: boolean
  shortfall: number
} {
  const hourlyRate = calculateEffectiveHourlyRate(baseSalary, commissions, workDaysPerWeek)

  // First 2h/day ≈ ~44h/month at 125%, rest at 150%
  // Simplified: assume first 44 hours at 125%, rest at 150%
  const hours125 = Math.min(contractGlobalHours, 44)
  const hours150 = Math.max(0, contractGlobalHours - 44)

  const minimumOvertimePay = round(
    hours125 * hourlyRate * 1.25 + hours150 * hourlyRate * 1.50,
  )

  const isAmountSufficient = contractGlobalAmount >= minimumOvertimePay
  const shortfall = isAmountSufficient ? 0 : round(minimumOvertimePay - contractGlobalAmount)

  return { minimumOvertimePay, isAmountSufficient, shortfall }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
