import type { OvertimeAnalysis } from '../../types'
import { round2 } from '../../lib/numbers'
import { calculateOvertime } from '../overtimeCalculator'
import type { SectionContext } from './context'

export function buildOvertimeAnalysis(ctx: SectionContext): OvertimeAnalysis {
  const { contract, payslip, profile } = ctx
  const overtimeHours = payslip.overtimeHours ?? 0
  const result = calculateOvertime({
    baseSalary: contract.baseSalary.value,
    commissions: payslip.commissionPay ?? 0,
    workDaysPerWeek: profile.workDaysPerWeek,
    totalHoursWorked: 182 + overtimeHours,
    overtimeHours125: Math.min(overtimeHours, 44),
    overtimeHours150: Math.max(0, overtimeHours - 44),
    nightShiftHours: 0,
    shabbatHours: 0,
  })
  return {
    model: contract.overtimeModel.value,
    expectedPay: result.totalOvertimePay,
    actualPay: payslip.overtimePay ?? 0,
    gap: round2(result.totalOvertimePay - (payslip.overtimePay ?? 0)),
    effectiveHourlyRate: result.effectiveHourlyRate,
  }
}
