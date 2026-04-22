import type { SectionCheck } from './context'
import { compareField } from './compareField'

export const checkPension: SectionCheck = (ctx) => {
  const { contract, payslip } = ctx
  const base = contract.baseSalary.value
  const findings = [
    compareField(
      'pension_employee', 'פנסיה עובד',
      base * (contract.pensionEmployeePct.value / 100),
      payslip.pensionEmployee,
      'warning', 'צו הרחבה לביטוח פנסיוני מקיף',
    ),
    compareField(
      'pension_employer', 'פנסיה מעסיק',
      base * (contract.pensionEmployerPct.value / 100),
      payslip.pensionEmployer,
      'warning', 'צו הרחבה לביטוח פנסיוני מקיף',
    ),
  ]
  return findings.filter((f): f is NonNullable<typeof f> => f !== null)
}
