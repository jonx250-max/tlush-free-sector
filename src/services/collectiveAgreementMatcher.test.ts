import { describe, it, expect } from 'vitest'
import { matchCollectiveAgreement, type CollectiveAgreement } from './collectiveAgreementMatcher'

describe('matchCollectiveAgreement', () => {
  it('returns null when no info provided', () => {
    const r = matchCollectiveAgreement(null, null)
    expect(r.matched).toBeNull()
    expect(r.confidence).toBe(0)
  })

  it('returns null when registry empty (pre-P7)', () => {
    const r = matchCollectiveAgreement('Acme', 'tech')
    expect(r.matched).toBeNull()
    expect(r.reason).toContain('P7')
  })

  it('matches by sector when registry populated', () => {
    const registry: CollectiveAgreement[] = [
      { id: 'tech-2026', name: 'הסכם הייטק', sector: 'tech', effectiveFrom: '2026-01-01', terms: {} },
    ]
    const r = matchCollectiveAgreement('Acme', 'tech', registry)
    expect(r.matched?.id).toBe('tech-2026')
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  it('case-insensitive sector match', () => {
    const registry: CollectiveAgreement[] = [
      { id: 'food-2026', name: 'הסכם מסעדנות', sector: 'food', effectiveFrom: '2026-01-01', terms: {} },
    ]
    const r = matchCollectiveAgreement(null, 'FOOD', registry)
    expect(r.matched?.id).toBe('food-2026')
  })
})
