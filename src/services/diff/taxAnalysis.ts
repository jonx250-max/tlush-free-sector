import type { TaxAnalysis } from '../../types'
import { round2 } from '../../lib/numbers'
import { calculateIncomeTax, calculateCreditPoints, calculateRegionalBenefit } from '../taxCalculator'
import type { CreditPointsInput } from '../taxCalculator'
import type { SectionContext } from './context'

export function buildTaxAnalysis(ctx: SectionContext): TaxAnalysis {
  const { payslip, profile, year } = ctx
  const creditInput: CreditPointsInput = toCreditInput(ctx)
  const taxBeforeCredits = calculateIncomeTax(payslip.grossSalary, year)
  const credits = calculateCreditPoints(creditInput, year)
  const regionalValue = profile.settlement
    ? calculateRegionalBenefit(profile.settlement, payslip.grossSalary, year).totalBenefit
    : 0
  const expectedTax = Math.max(0, round2(taxBeforeCredits - credits.monthlyValue - regionalValue))
  const actualTax = payslip.incomeTax ?? 0
  const overcharge = Math.max(0, round2(actualTax - expectedTax))
  return {
    expectedTax, actualTax, overcharge,
    creditPoints: credits.totalPoints,
    creditPointsValue: credits.monthlyValue,
    regionalBenefitValue: regionalValue,
  }
}

function toCreditInput(ctx: SectionContext): CreditPointsInput {
  const { profile } = ctx
  return {
    gender: profile.gender,
    childrenBirthYears: profile.childrenBirthYears,
    academicDegree: profile.academicDegree,
    degreeCompletionYear: profile.degreeCompletionYear,
    militaryService: profile.militaryService,
    isNewImmigrant: profile.isNewImmigrant,
    immigrationDate: profile.immigrationDate,
    disabilityPercentage: profile.disabilityPercentage,
    isSingleParent: profile.isSingleParent,
    reservistDays2026: profile.reservistDays2026,
  }
}
