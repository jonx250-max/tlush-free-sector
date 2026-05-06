/**
 * Stage E3 + E4 — shared band-math for contribution-style deductions
 * (Bituach Leumi, Mas Briut). Both follow the same shape:
 *   - reducedRate up to reducedCeiling
 *   - fullRate from reducedCeiling up to fullCeiling
 *   - amounts above fullCeiling are uncapped on the wage but no
 *     additional contribution accrues
 *
 * `expected` returns the monthly NIS amount the payslip should show
 * for the given gross.
 */

import { round2 } from '../../lib/numbers'
import type { ContributionBands } from '../lawVersion'

export function expectedContribution(grossMonthly: number, bands: ContributionBands): number {
  if (grossMonthly <= 0) return 0
  const lowerCeiling = Math.min(grossMonthly, bands.reducedRateCeilingMonthly)
  const lowerAmount = lowerCeiling * (bands.reducedRatePct / 100)

  const upperBase = Math.max(0, Math.min(grossMonthly, bands.fullRateCeilingMonthly) - bands.reducedRateCeilingMonthly)
  const upperAmount = upperBase * (bands.fullRatePct / 100)

  return round2(lowerAmount + upperAmount)
}
