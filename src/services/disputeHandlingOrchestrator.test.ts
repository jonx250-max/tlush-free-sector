import { describe, it, expect } from 'vitest'
import { recommendEscalation, type DisputeFinding } from './disputeHandlingOrchestrator'

describe('recommendEscalation', () => {
  it('zero findings → self_resolve', () => {
    const r = recommendEscalation([])
    expect(r.action).toBe('self_resolve')
    expect(r.totalGapNis).toBe(0)
  })

  it('small gap → self_resolve', () => {
    const findings: DisputeFinding[] = [
      { category: 'travel', severity: 'low', gapAmountNis: 500, monthsAffected: 1 },
    ]
    const r = recommendEscalation(findings)
    expect(r.action).toBe('self_resolve')
  })

  it('medium gap (1000-10000) → demand_letter_draft', () => {
    const findings: DisputeFinding[] = [
      { category: 'overtime', severity: 'medium', gapAmountNis: 5000, monthsAffected: 4 },
    ]
    const r = recommendEscalation(findings)
    expect(r.action).toBe('demand_letter_draft')
  })

  it('high severity → lawyer_consult', () => {
    const findings: DisputeFinding[] = [
      { category: 'pension', severity: 'high', gapAmountNis: 8000, monthsAffected: 6 },
    ]
    const r = recommendEscalation(findings)
    expect(r.action).toBe('lawyer_consult')
  })

  it('critical or 50K+ → court_filing', () => {
    const findings: DisputeFinding[] = [
      { category: 'severance', severity: 'critical', gapAmountNis: 60000, monthsAffected: 12 },
    ]
    const r = recommendEscalation(findings)
    expect(r.action).toBe('court_filing')
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('long-period finding triggers demand letter even at low gap', () => {
    const findings: DisputeFinding[] = [
      { category: 'meal', severity: 'low', gapAmountNis: 200, monthsAffected: 4 },
    ]
    const r = recommendEscalation(findings)
    expect(r.action).toBe('demand_letter_draft')
  })

  it('attaches statute-of-limitations warning at 12+ months', () => {
    const findings: DisputeFinding[] = [
      { category: 'pension', severity: 'medium', gapAmountNis: 3000, monthsAffected: 24 },
    ]
    const r = recommendEscalation(findings)
    expect(r.warnings.some(w => w.includes('התיישנות'))).toBe(true)
  })
})
