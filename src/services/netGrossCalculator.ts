// ============================================================
// Net-to-Gross Calculator — מחשבון נטו-ברוטו
// Bidirectional salary calculation with all deductions
// ============================================================

import { calculateIncomeTax, calculateCreditPoints, type CreditPointsInput } from './taxCalculator'
import { calculateAllDeductions } from './deductionsCalculator'

export interface NetGrossInput {
  year: number
  gender: 'male' | 'female'
  pensionEmployeePct: number
  kerenEmployeePct: number
  creditPointsInput: CreditPointsInput
}

export interface NetGrossBreakdown {
  gross: number
  taxBeforeCredits: number
  incomeTax: number
  creditPointsValue: number
  nationalInsurance: number
  healthInsurance: number
  pensionEmployee: number
  kerenEmployee: number
  totalDeductions: number
  net: number
}

export function grossToNet(gross: number, input: NetGrossInput): NetGrossBreakdown {
  const rawTax = calculateIncomeTax(gross, input.year)
  const credits = calculateCreditPoints(input.creditPointsInput, input.year)
  const creditPointsValue = credits.monthlyValue
  const incomeTax = Math.max(0, rawTax - creditPointsValue)

  const deductions = calculateAllDeductions(gross, input.year, gross, {
    employeeRate: input.pensionEmployeePct / 100,
    employerRate: 0.065,
    severanceRate: 0.0833,
  }, {
    employeeRate: input.kerenEmployeePct / 100,
    employerRate: 0.075,
  })

  const pensionEmployee = gross * (input.pensionEmployeePct / 100)
  const kerenEmployee = gross * (input.kerenEmployeePct / 100)
  const totalDeductions = incomeTax + deductions.nationalInsurance + deductions.healthInsurance + pensionEmployee + kerenEmployee
  const net = gross - totalDeductions

  return {
    gross,
    taxBeforeCredits: rawTax,
    incomeTax,
    creditPointsValue,
    nationalInsurance: deductions.nationalInsurance,
    healthInsurance: deductions.healthInsurance,
    pensionEmployee,
    kerenEmployee,
    totalDeductions,
    net,
  }
}

export function netToGross(targetNet: number, input: NetGrossInput): NetGrossBreakdown {
  // Binary search for gross that produces the target net
  let low = targetNet
  let high = targetNet * 2.5

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    const result = grossToNet(mid, input)
    if (Math.abs(result.net - targetNet) < 1) {
      return grossToNet(Math.round(mid), input)
    }
    if (result.net < targetNet) {
      low = mid
    } else {
      high = mid
    }
  }

  return grossToNet(Math.round(high), input)
}
