import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveDraft, loadDraft, clearDraft, draftAge } from './onboardingDraft'

// jsdom-ish localStorage shim (vitest 'node' env doesn't ship one)
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
}

beforeEach(() => {
  store.clear()
  vi.stubGlobal('window', { localStorage: localStorageMock })
})

describe('H7 — onboarding draft persistence', () => {
  it('round-trips data', () => {
    saveDraft('user-1', { foo: 1, bar: 'two' })
    expect(loadDraft<{ foo: number; bar: string }>('user-1')).toEqual({ foo: 1, bar: 'two' })
  })

  it('returns null when nothing saved', () => {
    expect(loadDraft('user-2')).toBeNull()
  })

  it('clears specific user draft', () => {
    saveDraft('user-3', { x: 1 })
    clearDraft('user-3')
    expect(loadDraft('user-3')).toBeNull()
  })

  it('scopes by user id (anon ≠ user-X)', () => {
    saveDraft(null, { who: 'anon' })
    saveDraft('user-4', { who: 'user-4' })
    expect(loadDraft<{ who: string }>(null)).toEqual({ who: 'anon' })
    expect(loadDraft<{ who: string }>('user-4')).toEqual({ who: 'user-4' })
  })

  it('draftAge returns ms-since-saved', () => {
    saveDraft('user-5', { a: 1 })
    const age = draftAge('user-5')
    expect(age).not.toBeNull()
    expect(age!).toBeGreaterThanOrEqual(0)
    expect(age!).toBeLessThan(1000)
  })

  it('draftAge returns null when no draft', () => {
    expect(draftAge('nope')).toBeNull()
  })
})
