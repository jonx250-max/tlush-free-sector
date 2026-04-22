import type { CreditRule } from './types'

export const disability: CreditRule = (input) => {
  if (input.disabilityPercentage >= 100) {
    return [{ reason: 'נכות 100%', points: 2.0 }]
  }
  if (input.disabilityPercentage >= 90) {
    return [{ reason: `נכות ${input.disabilityPercentage}%`, points: 1.5 }]
  }
  return []
}
