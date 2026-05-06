import { describe, it, expect } from 'vitest'
import { redactPII, redactLogLine } from './redact'

describe('C3 — redactPII', () => {
  it('redacts Israeli ID numbers', () => {
    expect(redactLogLine('id 123456789 here')).toBe('id <id-redacted> here')
  })

  it('redacts bank account patterns (3-4 digit branch + 6-12 digit account)', () => {
    expect(redactLogLine('account 123-4567890 detected')).toBe('account <bank-redacted> detected')
  })

  it('redacts Israeli phone numbers', () => {
    expect(redactLogLine('phone +972-50-123-4567')).toBe('phone <phone-redacted>')
    expect(redactLogLine('call 0501234567 now')).toBe('call <phone-redacted> now')
  })

  it('redacts email local part but keeps domain', () => {
    expect(redactLogLine('user alice@example.com')).toBe('user <email>@example.com')
  })

  it('redacts bearer tokens and JWTs', () => {
    expect(redactLogLine('Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890'))
      .toContain('Bearer <redacted>')
    expect(redactLogLine('jwt eyJabcdefghij.eyJabcdefghij.signaturepartabcde'))
      .toContain('<jwt-redacted>')
  })

  it('walks nested objects', () => {
    const input = {
      user: { id_number: '123456789', email: 'x@y.com' },
      meta: { token: 'sk-livehidden123', notes: 'phone 0501234567' },
    }
    const out = redactPII(input) as Record<string, unknown>
    const meta = out.meta as Record<string, unknown>
    expect(meta.token).toBe('<redacted>')
    expect(meta.notes).toBe('phone <phone-redacted>')
    const user = out.user as Record<string, unknown>
    expect(user.id_number).toBe('<redacted>')
    expect(user.email).toBe('<email>@y.com')
  })

  it('handles arrays', () => {
    const out = redactPII(['phone 0501234567', { id: 'foo', secret: 'bar' }])
    expect(out).toEqual(['phone <phone-redacted>', { id: 'foo', secret: '<redacted>' }])
  })

  it('handles cycles without infinite loop', () => {
    const a: { self?: unknown } = {}
    a.self = a
    expect(() => redactPII(a)).not.toThrow()
  })

  it('passes through primitives', () => {
    expect(redactPII(42)).toBe(42)
    expect(redactPII(true)).toBe(true)
    expect(redactPII(null)).toBe(null)
    expect(redactPII(undefined)).toBe(undefined)
  })
})
