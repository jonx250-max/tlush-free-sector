import { describe, it, expect } from 'vitest'
import { getLawSet, describeProvisional, SUPPORTED_LAW_YEARS } from './lawVersion'

describe('E1 — getLawSet', () => {
  it('exposes 2022..2026', () => {
    expect(SUPPORTED_LAW_YEARS).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    it(`year=${year} returns matching law set`, () => {
      const set = getLawSet(year)
      expect(set.year).toBe(year)
      expect(set.actualYear).toBe(year)
      expect(set.taxBrackets.length).toBeGreaterThan(0)
      expect(set.taxBrackets[0].rate).toBeGreaterThan(0)
    })
  }

  it('top bracket has limitMonthly=null', () => {
    const set = getLawSet(2026)
    expect(set.taxBrackets[set.taxBrackets.length - 1].limitMonthly).toBeNull()
  })

  it('flags isProvisional when any leaf is provisional', () => {
    // 2026 NII is currently marked provisional.
    expect(getLawSet(2026).isProvisional).toBe(true)
  })
})

describe('E2 — fallback when year unsupported', () => {
  it('2027 falls back to 2026', () => {
    const set = getLawSet(2027)
    expect(set.year).toBe(2027)
    expect(set.actualYear).toBe(2026)
    expect(set.isProvisional).toBe(true)
  })

  it('2030 falls back to most-recent', () => {
    const set = getLawSet(2030)
    expect(set.actualYear).toBe(2026)
    expect(set.isProvisional).toBe(true)
  })

  it('2020 (below supported) falls back to most-recent (we never provided 2020)', () => {
    const set = getLawSet(2020)
    expect(set.actualYear).toBe(2026)
    expect(set.isProvisional).toBe(true)
  })

  it('describeProvisional surfaces fallback year', () => {
    expect(describeProvisional(getLawSet(2027))).toMatch(/2027/)
  })
})
