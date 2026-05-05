/**
 * Stage E3 — Bituach Leumi (NII) deduction validation.
 *
 * Compares payslip NII line vs statutory expected based on the year's
 * bands from `LawSet`. Flags shortfall (employer underwithholding) or
 * excess (employer overwithholding).
 *
 * Result severity respects the provisional flag: if the year's bands
 * are still placeholder values, severity demotes from warning → info.
 */

import type { SectionCheck } from './context'
import { toleranceFor } from './context'
import { expectedContribution } from './contributionBands'
import { getLawSet } from '../lawVersion'

export const checkNationalInsurance: SectionCheck = (ctx) => {
  const law = getLawSet(ctx.year)
  const bands = law.nationalInsurance
  const gross = ctx.payslip.grossSalary
  if (!gross || gross <= 0) return []

  const actual = ctx.payslip.nationalInsurance ?? 0
  const expected = expectedContribution(gross, bands)
  const gap = Math.round((expected - actual) * 100) / 100
  const tol = toleranceFor(gross)

  if (Math.abs(gap) <= tol) return []

  // If the bands themselves are still provisional, soften the finding.
  const baseSeverity = bands.provisional ? 'info' : 'warning'

  const provisionalNote = bands.provisional
    ? ' (אומדן זמני — טבלת ביטוח לאומי טרם אומתה לשנה זו)'
    : ''

  return [{
    category: 'national_insurance',
    fieldName: 'ביטוח לאומי',
    contractValue: expected,
    payslipValue: actual,
    gap: Math.abs(gap),
    gapDirection: gap > 0 ? 'underpaid' : 'overpaid',
    severity: baseSeverity,
    legalReference: 'חוק הביטוח הלאומי',
    explanation: gap > 0
      ? `מצופה ניכוי של ${expected} ₪ אך נוכה ${actual} ₪${provisionalNote}`
      : `נוכה ${actual} ₪ במקום הצפוי ${expected} ₪${provisionalNote}`,
  }]
}
