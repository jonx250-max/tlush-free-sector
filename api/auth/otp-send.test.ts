import { describe, it, expect } from 'vitest'
import { normalizeIsraeliPhone } from './otp-send'

describe('normalizeIsraeliPhone', () => {
  it('handles 0XX-XXX-XXXX format', () => {
    expect(normalizeIsraeliPhone('050-123-4567')).toBe('+972501234567')
  })
  it('handles 0XXXXXXXXX format', () => {
    expect(normalizeIsraeliPhone('0501234567')).toBe('+972501234567')
  })
  it('handles spaces', () => {
    expect(normalizeIsraeliPhone('050 123 4567')).toBe('+972501234567')
  })
  it('handles parens', () => {
    expect(normalizeIsraeliPhone('(050) 123-4567')).toBe('+972501234567')
  })
  it('preserves +972 prefix', () => {
    expect(normalizeIsraeliPhone('+972501234567')).toBe('+972501234567')
  })
  it('handles 972 without +', () => {
    expect(normalizeIsraeliPhone('972501234567')).toBe('+972501234567')
  })
  it('rejects too short', () => {
    expect(normalizeIsraeliPhone('050')).toBe(null)
  })
  it('rejects too long', () => {
    expect(normalizeIsraeliPhone('050123456789012345')).toBe(null)
  })
  it('rejects non-Israeli', () => {
    expect(normalizeIsraeliPhone('+15551234567')).toBe(null)
  })
  it('rejects gibberish', () => {
    expect(normalizeIsraeliPhone('abc')).toBe(null)
  })
  it('rejects empty', () => {
    expect(normalizeIsraeliPhone('')).toBe(null)
  })
})
