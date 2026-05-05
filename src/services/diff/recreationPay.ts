/**
 * Stage E15 — recreation pay (דמי הבראה) entitlement check.
 *
 * Recreation pay is typically paid as a single annual payment (Jun/Jul
 * for most private-sector employees) but the entitlement accrues
 * monthly. This rule:
 *   1. Looks up the year's daily rate + days-by-seniority from LawSet.
 *   2. Computes annual entitlement = dailyRate * days(profile.yearsOfService).
 *   3. Searches the payslip entries[] for a line whose `name` matches
 *      Hebrew "הבראה" / English "recreation".
 *   4. Flags if the payslip line < expected (under-paid) by more than
 *      tolerance, or absent in a payslip month that should have shown
 *      it (heuristic: months 6 / 7).
 *
 * Provisional flag is honored: if rates are still placeholders, the
 * finding severity demotes to info.
 */

import type { SectionCheck } from './context'
import { toleranceFor } from './context'
import { getLawSet } from '../lawVersion'

const RECREATION_NAME_RE = /הבראה|recreation|recuperation/i
const RECREATION_PAID_MONTHS = new Set([6, 7])

function daysForSeniority(
  yearsOfService: number,
  schedule: { minYearsOfService: number; days: number }[],
): number {
  let days = 0
  for (const row of schedule) {
    if (yearsOfService >= row.minYearsOfService) days = row.days
  }
  return days
}

export const checkRecreationPay: SectionCheck = (ctx) => {
  const law = getLawSet(ctx.year)
  const r = law.recreationPay
  const days = daysForSeniority(ctx.profile.yearsOfService, r.scheduleByYearsService)
  if (days === 0) return []  // not yet entitled

  const expectedAnnual = Math.round(r.dailyRateNis * days * 100) / 100

  // Find a הבראה line on the payslip.
  const line = ctx.payslip.entries.find(e =>
    e.section === 'earnings' && RECREATION_NAME_RE.test(e.name),
  )
  const actual = line ? line.amount : 0

  const isPaymentMonth = RECREATION_PAID_MONTHS.has(ctx.payslip.month)
  // If not a typical payment month and payslip has no line, treat as
  // not-yet-due (no finding). If it IS a payment month and amount is
  // below expected, flag.
  if (!isPaymentMonth && actual === 0) return []

  const tol = toleranceFor(ctx.payslip.grossSalary)
  if (Math.abs(expectedAnnual - actual) <= tol) return []

  const severity = r.provisional ? 'info' : 'warning'
  const provisionalNote = r.provisional ? ' (אומדן זמני — תעריף יומי טרם אומת)' : ''

  return [{
    category: 'recuperation',
    fieldName: 'דמי הבראה',
    contractValue: expectedAnnual,
    payslipValue: actual || null,
    gap: Math.abs(expectedAnnual - actual),
    gapDirection: actual === 0 ? 'missing_from_payslip' : (actual < expectedAnnual ? 'underpaid' : 'overpaid'),
    severity,
    legalReference: 'צו הרחבה — דמי הבראה (סקטור פרטי)',
    explanation: `דמי הבראה צפויים: ${expectedAnnual} ₪ (${days} ימים × ${r.dailyRateNis} ₪/יום, לפי ${ctx.profile.yearsOfService} שנות ותק); בתלוש: ${actual} ₪${provisionalNote}`,
  }]
}
