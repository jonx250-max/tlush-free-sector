// SOURCE: חוק הודעה מוקדמת לפיטורים ולהתפטרות תשס"א-2001
// חודש 1-6: 1 יום לחודש. חודש 7-12 (שנה ראשונה): 6 ימים + 2.5 ימים לחודש מעבר ל-6.
// אחרי שנה: חודש מלא.

export interface AdvanceNoticeInput {
  monthsEmployed: number
  contractNoticeDays: number | null
  payslipNoticePay: number | null
  lastDailyWage: number
  isMonthlyEmployee: boolean
}

export interface AdvanceNoticeResult {
  legalMinimumDays: number
  contractDays: number
  applicableDays: number
  expectedNoticePay: number
  actualNoticePay: number
  shortfall: number
}

export function calculateAdvanceNotice(input: AdvanceNoticeInput): AdvanceNoticeResult {
  const legal = legalMinimum(input.monthsEmployed, input.isMonthlyEmployee)
  const contract = input.contractNoticeDays ?? 0
  const applicable = Math.max(legal, contract)
  const expected = round2(applicable * input.lastDailyWage)
  const actual = input.payslipNoticePay ?? 0
  const shortfall = Math.max(0, round2(expected - actual))
  return {
    legalMinimumDays: legal,
    contractDays: contract,
    applicableDays: applicable,
    expectedNoticePay: expected,
    actualNoticePay: actual,
    shortfall,
  }
}

function legalMinimum(monthsEmployed: number, isMonthly: boolean): number {
  if (isMonthly) {
    if (monthsEmployed < 6) return monthsEmployed
    if (monthsEmployed < 12) return 6 + Math.floor((monthsEmployed - 6) * 2.5)
    return 30
  }
  if (monthsEmployed < 12) return monthsEmployed
  if (monthsEmployed < 24) return 14 + Math.floor((monthsEmployed - 12))
  return 30
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
