import { describe, it, expect } from 'vitest'
import { normalizeEmail, hashEmail } from './freemium'

describe('normalizeEmail', () => {
  it('lowercases', () => {
    expect(normalizeEmail('Jane@Example.COM')).toBe('jane@example.com')
  })

  it('strips Gmail dots', () => {
    expect(normalizeEmail('jane.doe@gmail.com')).toBe('janedoe@gmail.com')
    expect(normalizeEmail('j.a.n.e@gmail.com')).toBe('jane@gmail.com')
  })

  it('strips + tags', () => {
    expect(normalizeEmail('jane+spam@example.com')).toBe('jane@example.com')
    expect(normalizeEmail('jane.doe+work@gmail.com')).toBe('janedoe@gmail.com')
  })

  it('treats googlemail.com as gmail.com', () => {
    expect(normalizeEmail('jane@googlemail.com')).toBe('jane@gmail.com')
  })

  it('does not strip dots on non-Gmail domains', () => {
    expect(normalizeEmail('jane.doe@example.com')).toBe('jane.doe@example.com')
  })

  it('trims whitespace', () => {
    expect(normalizeEmail('  jane@example.com  ')).toBe('jane@example.com')
  })

  it('handles bare local part (no domain) gracefully', () => {
    expect(normalizeEmail('Jane')).toBe('jane')
  })
})

describe('hashEmail', () => {
  it('produces SHA-256 hex (64 chars)', async () => {
    const h = await hashEmail('jane@example.com')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('same normalized email → same hash', async () => {
    const a = await hashEmail('Jane.Doe+spam@gmail.com')
    const b = await hashEmail('janedoe@gmail.com')
    expect(a).toBe(b)
  })

  it('different normalized emails → different hashes', async () => {
    const a = await hashEmail('alice@example.com')
    const b = await hashEmail('bob@example.com')
    expect(a).not.toBe(b)
  })
})
