import type { CreditRule, CreditContribution } from './types'

export const children: CreditRule = (input, year) => {
  const out: CreditContribution[] = []
  for (const birthYear of input.childrenBirthYears) {
    const age = year - birthYear
    if (age >= 0 && age <= 5) {
      out.push({ reason: `ילד/ה גיל ${age}`, points: 2.5 })
    } else if (age >= 6 && age <= 17) {
      out.push({ reason: `ילד/ה גיל ${age}`, points: 1.0 })
    } else if (age === 18) {
      out.push({ reason: `ילד/ה גיל 18`, points: 0.5 })
    }
  }
  return out
}
