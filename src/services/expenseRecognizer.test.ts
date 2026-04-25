import { describe, it, expect } from 'vitest'
import { recognizeExpenses } from './expenseRecognizer'

describe('recognizeExpenses', () => {
  it('recognizes within-cap expenses', () => {
    const r = recognizeExpenses([{ type: 'travel', monthlyAmount: 500 }])
    expect(r.recognized).toHaveLength(1)
    expect(r.suspicious).toHaveLength(0)
  })

  it('flags above-cap travel as suspicious', () => {
    const r = recognizeExpenses([{ type: 'travel', monthlyAmount: 1500 }])
    expect(r.suspicious).toHaveLength(1)
    expect(r.totalSuspiciousNis).toBeGreaterThan(0)
  })

  it('handles mixed entries', () => {
    const r = recognizeExpenses([
      { type: 'meal', monthlyAmount: 500 },
      { type: 'phone', monthlyAmount: 800 }, // above 200 cap
    ])
    expect(r.recognized).toHaveLength(1)
    expect(r.suspicious).toHaveLength(1)
  })

  it('caps recognized at the legal max', () => {
    const r = recognizeExpenses([{ type: 'home_office', monthlyAmount: 1000 }])
    expect(r.totalRecognizedNis).toBe(600) // capped at home_office max
  })

  it('returns zero totals for empty input', () => {
    const r = recognizeExpenses([])
    expect(r.totalRecognizedNis).toBe(0)
    expect(r.totalSuspiciousNis).toBe(0)
  })
})
