// SOURCE: צו הרחבה הסכם תחבורה — החזר נסיעות ציבוריות
// תקרה יומית 22.6 ₪ (2026), חישוב לפי כרטיס חופשי-חודשי באזור.

import { round2 } from '../lib/numbers'

export interface CommuteInput {
  workDaysInMonth: number
  monthlyTravelCardCost: number | null
  payslipTravelAllowance: number | null
}

export interface CommuteResult {
  expectedReimbursement: number
  actualReimbursement: number
  shortfall: number
  hasData: boolean
}

const DAILY_CAP = 22.6

export function calculateCommute(input: CommuteInput): CommuteResult {
  if (input.monthlyTravelCardCost === null && input.payslipTravelAllowance === null) {
    return { expectedReimbursement: 0, actualReimbursement: 0, shortfall: 0, hasData: false }
  }
  const dailyCap = DAILY_CAP * input.workDaysInMonth
  const cardCost = input.monthlyTravelCardCost ?? 0
  const expected = round2(Math.min(cardCost, dailyCap))
  const actual = input.payslipTravelAllowance ?? 0
  const shortfall = Math.max(0, round2(expected - actual))
  return { expectedReimbursement: expected, actualReimbursement: actual, shortfall, hasData: true }
}
