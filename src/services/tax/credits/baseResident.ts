import type { CreditRule } from './types'

export const baseResident: CreditRule = (input) => {
  const points = input.gender === 'female' ? 2.75 : 2.25
  return [{ reason: 'תושב/ת', points }]
}
