import type { SectionCheck } from './context'
import { compareField } from './compareField'
import { downgradeForConfidence } from './confidenceGate'

export const checkPension: SectionCheck = (ctx) => {
  const { contract, payslip } = ctx
  const base = contract.baseSalary.value

  // Stage E12 — pension rates often parsed at low confidence; gate severity.
  const empGate = downgradeForConfidence(contract.pensionEmployeePct, 'warning')
  const erGate = downgradeForConfidence(contract.pensionEmployerPct, 'warning')

  const empFinding = compareField(
    'pension_employee', 'פנסיה עובד',
    base * (contract.pensionEmployeePct.value / 100),
    payslip.pensionEmployee,
    empGate.severity, 'צו הרחבה לביטוח פנסיוני מקיף',
    payslip.grossSalary,
  )
  if (empFinding && empGate.note) empFinding.explanation += empGate.note

  const erFinding = compareField(
    'pension_employer', 'פנסיה מעסיק',
    base * (contract.pensionEmployerPct.value / 100),
    payslip.pensionEmployer,
    erGate.severity, 'צו הרחבה לביטוח פנסיוני מקיף',
    payslip.grossSalary,
  )
  if (erFinding && erGate.note) erFinding.explanation += erGate.note

  return [empFinding, erFinding].filter((f): f is NonNullable<typeof f> => f !== null)
}
