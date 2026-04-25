import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isGeoAllowed } from './geoCheck'

describe('isGeoAllowed', () => {
  const orig = process.env.GEO_BYPASS_TOKENS

  beforeEach(() => { delete process.env.GEO_BYPASS_TOKENS })
  afterEach(() => {
    if (orig === undefined) delete process.env.GEO_BYPASS_TOKENS
    else process.env.GEO_BYPASS_TOKENS = orig
  })

  it('allows IL', () => {
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'IL' })
    expect(r.allowed).toBe(true)
    expect(r.country).toBe('IL')
  })

  it('blocks US', () => {
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'US' })
    expect(r.allowed).toBe(false)
    expect(r.country).toBe('US')
  })

  it('blocks RU', () => {
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'RU' })
    expect(r.allowed).toBe(false)
  })

  it('local dev (no header) → allowed', () => {
    const r = isGeoAllowed({})
    expect(r.allowed).toBe(true)
    expect(r.country).toBe('local-dev')
  })

  it('case-insensitive header lookup', () => {
    const r = isGeoAllowed({ 'X-Vercel-IP-Country': 'IL' })
    // The lowercase fallback handles both casings
    expect(r.allowed).toBe(true)
  })

  it('invite token bypasses block when valid', () => {
    process.env.GEO_BYPASS_TOKENS = 'tok1,tok2'
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'US' }, { invite: 'tok1' })
    expect(r.allowed).toBe(true)
    expect(r.reason).toBe('invite-bypass')
  })

  it('invalid invite token does NOT bypass block', () => {
    process.env.GEO_BYPASS_TOKENS = 'tok1'
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'US' }, { invite: 'wrong' })
    expect(r.allowed).toBe(false)
  })

  it('missing GEO_BYPASS_TOKENS rejects all invite attempts', () => {
    const r = isGeoAllowed({ 'x-vercel-ip-country': 'US' }, { invite: 'any' })
    expect(r.allowed).toBe(false)
  })

  it('handles array header value', () => {
    const r = isGeoAllowed({ 'x-vercel-ip-country': ['IL', 'XX'] })
    expect(r.allowed).toBe(true)
  })
})
