import { describe, it, expect } from 'vitest'
import { CHECK_REGISTRY, checksForTier, getCheckMeta } from './checkRegistry'

describe('CHECK_REGISTRY', () => {
  it('contains 32 checks (Plan §2.5: 28 in Pro + 4 Premium-exclusive)', () => {
    expect(CHECK_REGISTRY).toHaveLength(32)
  })

  it('has unique IDs', () => {
    const ids = CHECK_REGISTRY.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every check has a service reference', () => {
    for (const c of CHECK_REGISTRY) {
      expect(c.service).toBeTruthy()
      expect(c.service.length).toBeGreaterThan(0)
    }
  })

  it('only collective_agreement and extension_order are stub_data_pending', () => {
    const stubs = CHECK_REGISTRY.filter(c => c.status === 'stub_data_pending')
    expect(stubs.map(s => s.id).sort()).toEqual(['collective_agreement_match', 'extension_order_check'])
  })
})

describe('checksForTier', () => {
  it('free tier = 3 checks', () => {
    expect(checksForTier('free')).toHaveLength(3)
  })

  it('basic tier = 14 checks', () => {
    expect(checksForTier('basic')).toHaveLength(14)
  })

  it('pro tier = 28 checks', () => {
    expect(checksForTier('pro')).toHaveLength(28)
  })

  it('premium tier = 32 checks (Pro 28 + 4 Premium-exclusive)', () => {
    expect(checksForTier('premium')).toHaveLength(32)
  })

  it('higher tier strictly contains lower', () => {
    const free = new Set(checksForTier('free'))
    const basic = new Set(checksForTier('basic'))
    const pro = new Set(checksForTier('pro'))
    const premium = new Set(checksForTier('premium'))
    for (const id of free) expect(basic.has(id)).toBe(true)
    for (const id of basic) expect(pro.has(id)).toBe(true)
    for (const id of pro) expect(premium.has(id)).toBe(true)
  })
})

describe('getCheckMeta', () => {
  it('returns meta for known check', () => {
    const meta = getCheckMeta('salary_minimum')
    expect(meta?.minTier).toBe('free')
    expect(meta?.category).toBe('salary')
  })

  it('returns undefined for unknown check', () => {
    expect(getCheckMeta('nonexistent_check')).toBeUndefined()
  })
})
