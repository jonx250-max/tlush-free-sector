import type { CreditRule } from './types'

export const newImmigrant: CreditRule = (input, year) => {
  if (!input.isNewImmigrant || !input.immigrationDate) return []
  const immigrationYear = new Date(input.immigrationDate).getFullYear()
  const yearsSince = year - immigrationYear
  if (yearsSince <= 1) {
    return [{ reason: 'עולה חדש/ה — שנה ראשונה', points: 4.5 }]
  }
  if (yearsSince === 2) {
    return [{ reason: 'עולה חדש/ה — שנה שנייה', points: 3.0 }]
  }
  if (yearsSince === 3) {
    return [{ reason: 'עולה חדש/ה — שנה שלישית', points: 2.0 }]
  }
  return []
}
