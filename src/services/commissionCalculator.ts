// ============================================================
// Commission Calculator & Fictitious Bonus Detection
// ============================================================

export interface CommissionAnalysis {
  commissionPay: number
  isIncludedInPensionBase: boolean
  pensionShortfall: number
  isFictitiousBonus: boolean
  effectiveBaseForOvertime: number
}

/**
 * Analyze commission handling in payslip vs contract.
 * Israeli law: commissions are part of "שכר קובע" (determining salary)
 * and MUST be included in pension/severance/overtime base calculations.
 */
export function analyzeCommissions(
  baseSalary: number,
  commissionPay: number,
  pensionEmployeeDeducted: number,
  pensionEmployeeRate: number,
): CommissionAnalysis {
  if (commissionPay <= 0) {
    return {
      commissionPay: 0,
      isIncludedInPensionBase: true,
      pensionShortfall: 0,
      isFictitiousBonus: false,
      effectiveBaseForOvertime: baseSalary,
    }
  }

  const correctPensionBase = baseSalary + commissionPay
  const expectedPension = round(correctPensionBase * pensionEmployeeRate)
  const baseOnlyPension = round(baseSalary * pensionEmployeeRate)

  // If deducted pension is closer to base-only → commissions excluded
  const isIncludedInPensionBase =
    Math.abs(pensionEmployeeDeducted - expectedPension) <
    Math.abs(pensionEmployeeDeducted - baseOnlyPension)

  const pensionShortfall = isIncludedInPensionBase
    ? 0
    : round(expectedPension - pensionEmployeeDeducted)

  return {
    commissionPay,
    isIncludedInPensionBase,
    pensionShortfall: Math.max(0, pensionShortfall),
    isFictitiousBonus: false,
    effectiveBaseForOvertime: correctPensionBase,
  }
}

/**
 * Detect fictitious bonus — same fixed amount appearing 3+ consecutive months.
 * If a "bonus" appears identically month after month, it's actually a salary component
 * and must be included in base for all calculations.
 */
export function detectFictitiousBonus(
  bonusAmounts: number[],
  minConsecutive: number = 3,
): { isFictitious: boolean; amount: number; consecutiveMonths: number } {
  if (bonusAmounts.length < minConsecutive) {
    return { isFictitious: false, amount: 0, consecutiveMonths: 0 }
  }

  let maxConsecutive = 1
  let currentConsecutive = 1
  let fictitiousAmount = 0

  for (let i = 1; i < bonusAmounts.length; i++) {
    if (bonusAmounts[i] === bonusAmounts[i - 1] && bonusAmounts[i] > 0) {
      currentConsecutive++
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive
        fictitiousAmount = bonusAmounts[i]
      }
    } else {
      currentConsecutive = 1
    }
  }

  return {
    isFictitious: maxConsecutive >= minConsecutive,
    amount: maxConsecutive >= minConsecutive ? fictitiousAmount : 0,
    consecutiveMonths: maxConsecutive,
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
