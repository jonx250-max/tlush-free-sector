import type { CreditRule } from './types'

const DEGREE_POINTS: Record<string, { reason: string; points: number }> = {
  ba: { reason: 'תואר ראשון', points: 1.0 },
  ma: { reason: 'תואר שני', points: 0.5 },
  phd: { reason: 'דוקטורט', points: 1.0 },
}

export const academicDegree: CreditRule = (input, year) => {
  const entry = DEGREE_POINTS[input.academicDegree]
  if (!entry || !input.degreeCompletionYear) return []
  const yearsSince = year - input.degreeCompletionYear
  if (yearsSince < 0 || yearsSince > 2) return []
  return [entry]
}
