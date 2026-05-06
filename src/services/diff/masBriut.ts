/**
 * Stage E4 — Mas Briut (health insurance) deduction validation.
 *
 * Mirror of nationalInsurance.ts but using the masBriut bands.
 * Bands typically share the NII ceiling structure but rates differ
 * (3.10% / 5.00% in 2026).
 */

import type { SectionCheck } from './context'
import { toleranceFor } from './context'
import { expectedContribution } from './contributionBands'
import { getLawSet } from '../lawVersion'

export const checkMasBriut: SectionCheck = (ctx) => {
  const law = getLawSet(ctx.year)
  const bands = law.masBriut
  const gross = ctx.payslip.grossSalary
  if (!gross || gross <= 0) return []

  const actual = ctx.payslip.healthInsurance ?? 0
  const expected = expectedContribution(gross, bands)
  const gap = Math.round((expected - actual) * 100) / 100
  const tol = toleranceFor(gross)

  if (Math.abs(gap) <= tol) return []

  const baseSeverity = bands.provisional ? 'info' : 'warning'
  const provisionalNote = bands.provisional
    ? ' (אומדן זמני — טבלת מס בריאות טרם אומתה לשנה זו)'
    : ''

  return [{
    category: 'health_insurance',
    fieldName: 'מס בריאות',
    contractValue: expected,
    payslipValue: actual,
    gap: Math.abs(gap),
    gapDirection: gap > 0 ? 'underpaid' : 'overpaid',
    severity: baseSeverity,
    legalReference: 'חוק ביטוח בריאות ממלכתי',
    explanation: gap > 0
      ? `מצופה ניכוי של ${expected} ₪ אך נוכה ${actual} ₪${provisionalNote}`
      : `נוכה ${actual} ₪ במקום הצפוי ${expected} ₪${provisionalNote}`,
  }]
}
