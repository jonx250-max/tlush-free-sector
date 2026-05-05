import type { AnalysisFinding } from '../../types'
import type { TaxSectionCheck } from './context'
import { toleranceFor } from './context'

export const checkTax: TaxSectionCheck = (ctx, analysis) => {
  const findings: AnalysisFinding[] = []
  // Stage E5 — proportional tolerance based on payslip gross.
  const tol = toleranceFor(ctx.payslip.grossSalary)

  // Over-deduction: tax withheld > expected.
  if (analysis.overcharge > tol) {
    findings.push({
      category: 'income_tax',
      fieldName: 'מס הכנסה ביתר',
      contractValue: analysis.expectedTax,
      payslipValue: analysis.actualTax,
      gap: analysis.overcharge,
      gapDirection: 'overpaid',
      severity: 'warning',
      legalReference: 'פקודת מס הכנסה',
      explanation: `נוכה מס ${analysis.actualTax} ₪ במקום ${analysis.expectedTax} ₪ — ייתכן שחסרות נקודות זיכוי`,
    })
  }

  // Stage E8 — under-deduction. Payslip withholds LESS than expected:
  // employee may end the year owing tax. Surface as info, not warning.
  const undercharge = Math.round((analysis.expectedTax - analysis.actualTax) * 100) / 100
  if (undercharge > tol) {
    findings.push({
      category: 'income_tax',
      fieldName: 'מס הכנסה בחסר',
      contractValue: analysis.expectedTax,
      payslipValue: analysis.actualTax,
      gap: undercharge,
      gapDirection: 'underpaid',
      severity: 'info',
      legalReference: 'פקודת מס הכנסה',
      explanation: `נוכה מס ${analysis.actualTax} ₪ במקום ${analysis.expectedTax} ₪ — ייתכן שחסר ניכוי במקור (תיתכן חבות מס בסוף שנה)`,
    })
  }

  return findings
}
