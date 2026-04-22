import type { CreditRule } from './types'

export const singleParent: CreditRule = (input) => {
  if (!input.isSingleParent) return []
  return [{ reason: 'הורה יחיד/נית', points: 1.0 }]
}
