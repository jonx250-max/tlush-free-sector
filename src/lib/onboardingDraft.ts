/**
 * Stage H7 — onboarding wizard save-as-draft.
 *
 * Persists the in-progress wizard state to localStorage, scoped per
 * user id. Restores on next visit so refresh / accidental nav doesn't
 * cost data. Cleared on `clear()` after successful submit.
 *
 * SSR-safe: every helper checks `typeof window` first.
 */

const KEY_PREFIX = 'tlush.onboarding.draft.v1'
const SCHEMA_VERSION = 1

interface Envelope<T> {
  schema: number
  savedAt: number
  data: T
}

function key(userId: string | null | undefined): string {
  return `${KEY_PREFIX}.${userId || 'anon'}`
}

export function saveDraft<T>(userId: string | null | undefined, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const envelope: Envelope<T> = { schema: SCHEMA_VERSION, savedAt: Date.now(), data }
    window.localStorage.setItem(key(userId), JSON.stringify(envelope))
  } catch {
    // Quota exceeded / private browsing — silently swallow.
  }
}

export function loadDraft<T>(userId: string | null | undefined): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(userId))
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope<T>
    if (env.schema !== SCHEMA_VERSION) return null
    return env.data
  } catch {
    return null
  }
}

export function clearDraft(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key(userId)) } catch { /* noop */ }
}

export function draftAge(userId: string | null | undefined): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(userId))
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope<unknown>
    if (env.schema !== SCHEMA_VERSION) return null
    return Date.now() - env.savedAt
  } catch {
    return null
  }
}
