/**
 * Stage E7 — allowance parity (travel, meal, phone).
 *
 * For each allowance: if the contract specifies an amount, the payslip
 * must show at least that amount. Missing-from-payslip = critical;
 * underpayment = warning; over-payment treated as match (employer
 * giving more than contract is fine).
 */

import type { SectionCheck } from './context'
import { compareField } from './compareField'
import type { AnalysisFinding, FindingCategory } from '../../types'

interface AllowanceSpec {
  category: FindingCategory
  label: string
  contractField: 'travelAllowance' | 'mealAllowance' | 'phoneAllowance'
  payslipField: 'travelAllowance' | 'mealAllowance' | 'phoneAllowance'
  legalRef: string
}

const SPECS: AllowanceSpec[] = [
  {
    category: 'travel',
    label: 'החזר נסיעות',
    contractField: 'travelAllowance',
    payslipField: 'travelAllowance',
    legalRef: 'צו הרחבה — דמי נסיעה לעבודה',
  },
  {
    category: 'meals',
    label: 'דמי ארוחות',
    contractField: 'mealAllowance',
    payslipField: 'mealAllowance',
    legalRef: 'הסכם אישי / צו הרחבה',
  },
  {
    category: 'phone',
    label: 'אש"ל / טלפון',
    contractField: 'phoneAllowance',
    payslipField: 'phoneAllowance',
    legalRef: 'הסכם אישי',
  },
]

export const checkAllowances: SectionCheck = (ctx) => {
  const findings: AnalysisFinding[] = []
  for (const spec of SPECS) {
    const contractAmount = ctx.contract[spec.contractField].value
    const payslipAmount = ctx.payslip[spec.payslipField]
    if (contractAmount === null || contractAmount === undefined) continue

    const finding = compareField(
      spec.category,
      spec.label,
      contractAmount,
      payslipAmount,
      payslipAmount === null ? 'critical' : 'warning',
      spec.legalRef,
      ctx.payslip.grossSalary,
    )
    if (!finding) continue
    // Allowing employer to OVER-pay an allowance: drop the finding.
    if (finding.gapDirection === 'overpaid') continue
    findings.push(finding)
  }
  return findings
}
