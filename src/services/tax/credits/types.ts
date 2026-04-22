import type { CreditPointsInput } from '../../taxCalculator'

export interface CreditContribution {
  reason: string
  points: number
}

export type CreditRule = (input: CreditPointsInput, year: number) => CreditContribution[]
