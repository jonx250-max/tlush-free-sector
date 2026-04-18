// SOURCE: לרוב לפי הסכם קיבוצי ענפי (בנקאות, היי-טק, חברות מסוימות)
// אם בחוזה מצוין — בודקים שהבונוס שולם בחודש המתאים (לרוב דצמבר/יוני).

export interface ThirteenthSalaryInput {
  contractMentions13thSalary: boolean
  expectedAmount: number | null
  payslipBonusPay: number
  monthlyBaseGross: number
  monthOfYear: number
  expectedPaymentMonths: number[]
}

export interface ThirteenthSalaryResult {
  isExpected: boolean
  expectedAmount: number
  actualAmount: number
  shortfall: number
  isPaymentMonth: boolean
}

export function calculateThirteenthSalary(input: ThirteenthSalaryInput): ThirteenthSalaryResult {
  if (!input.contractMentions13thSalary) {
    return {
      isExpected: false, expectedAmount: 0, actualAmount: input.payslipBonusPay,
      shortfall: 0, isPaymentMonth: false,
    }
  }
  const isPaymentMonth = input.expectedPaymentMonths.includes(input.monthOfYear)
  if (!isPaymentMonth) {
    return {
      isExpected: true, expectedAmount: 0, actualAmount: input.payslipBonusPay,
      shortfall: 0, isPaymentMonth: false,
    }
  }
  const expected = input.expectedAmount ?? input.monthlyBaseGross
  const shortfall = Math.max(0, round2(expected - input.payslipBonusPay))
  return {
    isExpected: true, expectedAmount: expected, actualAmount: input.payslipBonusPay,
    shortfall, isPaymentMonth: true,
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
