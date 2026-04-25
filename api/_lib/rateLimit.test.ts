import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, _resetForTests, extractClientIp } from './rateLimit'

describe('rateLimit', () => {
  beforeEach(() => { _resetForTests() })

  it('allows under limit', () => {
    const r = rateLimit({ key: 'ip1', limit: 3, windowMs: 60_000 })
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it('blocks at limit', () => {
    rateLimit({ key: 'ip1', limit: 2, windowMs: 60_000 })
    rateLimit({ key: 'ip1', limit: 2, windowMs: 60_000 })
    const r = rateLimit({ key: 'ip1', limit: 2, windowMs: 60_000 })
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('separate keys have separate buckets', () => {
    rateLimit({ key: 'ip1', limit: 1, windowMs: 60_000 })
    const r = rateLimit({ key: 'ip2', limit: 1, windowMs: 60_000 })
    expect(r.allowed).toBe(true)
  })

  it('hits older than window are evicted', async () => {
    rateLimit({ key: 'ip1', limit: 1, windowMs: 50 })
    await new Promise(r => setTimeout(r, 80))
    const r = rateLimit({ key: 'ip1', limit: 1, windowMs: 50 })
    expect(r.allowed).toBe(true)
  })
})

describe('extractClientIp', () => {
  it('reads x-forwarded-for', () => {
    expect(extractClientIp({ 'x-forwarded-for': '1.2.3.4' })).toBe('1.2.3.4')
  })
  it('takes first hop from comma-separated chain', () => {
    expect(extractClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4')
  })
  it('falls back through header list', () => {
    expect(extractClientIp({ 'cf-connecting-ip': '9.9.9.9' })).toBe('9.9.9.9')
  })
  it('returns unknown when no header present', () => {
    expect(extractClientIp({})).toBe('unknown')
  })
})
