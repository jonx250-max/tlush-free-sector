import { describe, it, expect } from 'vitest'
import { findApplicableOrders, type ExtensionOrder } from './extensionOrderRegistry'

describe('findApplicableOrders', () => {
  it('returns empty when no sector given', () => {
    const r = findApplicableOrders(null)
    expect(r.applicable).toEqual([])
  })

  it('returns empty + P7 reason when registry empty', () => {
    const r = findApplicableOrders('food')
    expect(r.applicable).toEqual([])
    expect(r.reason).toContain('P7')
  })

  it('returns matching active order', () => {
    const registry: ExtensionOrder[] = [
      {
        id: 'ext-food-2026', name: 'הרחבה — מסעדנות 2026',
        sector: 'food', effectiveFrom: '2026-01-01',
        effectiveUntil: null, scope: 'IL',
        bindingTerms: ['מינימום שכר ענפי ₪38/שעה'],
      },
    ]
    const r = findApplicableOrders('food', '2026-04-25', registry)
    expect(r.applicable).toHaveLength(1)
  })

  it('skips expired orders', () => {
    const registry: ExtensionOrder[] = [
      {
        id: 'old', name: 'old', sector: 'food',
        effectiveFrom: '2020-01-01', effectiveUntil: '2024-12-31',
        scope: 'IL', bindingTerms: [],
      },
    ]
    const r = findApplicableOrders('food', '2026-04-25', registry)
    expect(r.applicable).toEqual([])
  })

  it('skips not-yet-effective orders', () => {
    const registry: ExtensionOrder[] = [
      {
        id: 'future', name: 'future', sector: 'food',
        effectiveFrom: '2027-01-01', effectiveUntil: null,
        scope: 'IL', bindingTerms: [],
      },
    ]
    const r = findApplicableOrders('food', '2026-04-25', registry)
    expect(r.applicable).toEqual([])
  })
})
