import type { CreditPointsInput, CreditPointsResult } from '../taxCalculator'
import { round2 } from '../../lib/numbers'
import { CREDIT_POINT_VALUES } from './values'
import type { CreditRule } from './credits/types'
import { baseResident } from './credits/baseResident'
import { children } from './credits/children'
import { singleParent } from './credits/singleParent'
import { academicDegree } from './credits/academicDegree'
import { military } from './credits/military'
import { reservist } from './credits/reservist'
import { disability } from './credits/disability'
import { newImmigrant } from './credits/newImmigrant'

const RULES: CreditRule[] = [
  baseResident,
  children,
  singleParent,
  academicDegree,
  military,
  reservist,
  disability,
  newImmigrant,
]

export function calculateCreditPoints(
  input: CreditPointsInput,
  year: number,
): CreditPointsResult {
  const breakdown = RULES.flatMap(rule => rule(input, year))
  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0)
  const pointValue = CREDIT_POINT_VALUES[year] ?? CREDIT_POINT_VALUES[2026]
  const monthlyValue = round2(totalPoints * pointValue)
  return { totalPoints, breakdown, monthlyValue }
}
