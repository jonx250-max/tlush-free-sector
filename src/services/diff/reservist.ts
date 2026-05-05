/**
 * Stage E16 — reservist (מילואים) compensation.
 *
 * חוק חיילים משוחררים §17א obliges the employer to pay at least the
 * worker's regular daily wage for reserve duty days. Bituach Leumi
 * reimburses the employer up to a statutory ceiling; the employer
 * MUST top up if the worker's regular daily wage exceeds that ceiling.
 *
 * Heuristic implementation (refine when collective-agreement nuances
 * known):
 *   1. expected = max(regularDailyAvg, lawSet.reservist.statutoryMinimumDailyPayNis)
 *      where regularDailyAvg = grossSalary / averagingDivisor (typ. 25)
 *   2. Look for a payslip line matching מילואים/reserve.
 *   3. Compare to expected * profile.reservistDays.
 *
 * Skips entirely if profile.reservistDays2026 === 0 (most users).
 */

import type { SectionCheck } from './context'
import { toleranceFor } from './context'
import { getLawSet } from '../lawVersion'

const RESERVIST_NAME_RE = /מילואים|reserve|reservist/i

export const checkReservist: SectionCheck = (ctx) => {
  const days = ctx.profile.reservistDays2026
  if (!days || days <= 0) return []

  const law = getLawSet(ctx.year)
  const r = law.reservist
  const gross = ctx.payslip.grossSalary
  if (!gross || gross <= 0) return []

  const regularDaily = gross / r.averagingDivisor
  const dailyExpected = Math.max(regularDaily, r.statutoryMinimumDailyPayNis)
  const expectedTotal = Math.round(dailyExpected * days * 100) / 100

  const line = ctx.payslip.entries.find(e => RESERVIST_NAME_RE.test(e.name))
  const actual = line ? line.amount : 0

  const tol = toleranceFor(gross)
  if (Math.abs(expectedTotal - actual) <= tol) return []

  const severity = r.provisional ? 'info' : 'warning'
  const provisionalNote = r.provisional ? ' (אומדן זמני)' : ''

  return [{
    category: 'military_reserve_pay',
    fieldName: 'תשלום מילואים',
    contractValue: expectedTotal,
    payslipValue: actual || null,
    gap: Math.abs(expectedTotal - actual),
    gapDirection: actual === 0 ? 'missing_from_payslip' : (actual < expectedTotal ? 'underpaid' : 'overpaid'),
    severity,
    legalReference: r.lawSection,
    explanation: `מילואים: ${days} ימים × ${Math.round(dailyExpected * 100) / 100} ₪/יום = ${expectedTotal} ₪; בתלוש: ${actual} ₪${provisionalNote}`,
  }]
}
