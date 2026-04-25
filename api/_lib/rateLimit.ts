/**
 * In-memory sliding-window rate limiter.
 *
 * For prod scale → swap to Upstash Redis (same interface). For MVP
 * + per-Vercel-instance rate-limiting, in-memory Map is enough since
 * abuse rarely scales across instances faster than warming.
 *
 * Usage:
 *   const result = rateLimit({ key: ip, limit: 30, windowMs: 60_000 })
 *   if (!result.allowed) return res.status(429).json({ ... })
 */

interface Bucket {
  hits: number[]
}

const STORE = new Map<string, Bucket>()
const MAX_KEYS = 10_000 // memory cap
let lastSweep = 0

export interface RateLimitConfig {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  sweepIfNeeded(now)

  const bucket = STORE.get(cfg.key) ?? { hits: [] }
  // Drop hits outside window
  bucket.hits = bucket.hits.filter(ts => ts > now - cfg.windowMs)

  if (bucket.hits.length >= cfg.limit) {
    const oldestInWindow = bucket.hits[0]
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + cfg.windowMs,
    }
  }

  bucket.hits.push(now)
  STORE.set(cfg.key, bucket)

  return {
    allowed: true,
    remaining: cfg.limit - bucket.hits.length,
    resetAt: now + cfg.windowMs,
  }
}

function sweepIfNeeded(now: number) {
  if (now - lastSweep < 60_000 && STORE.size < MAX_KEYS) return
  lastSweep = now
  for (const [key, bucket] of STORE) {
    if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < now - 600_000) {
      STORE.delete(key)
    }
  }
}

export function _resetForTests() {
  STORE.clear()
  lastSweep = 0
}

export function extractClientIp(headers: Record<string, string | string[] | undefined>): string {
  const candidates = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
  ]
  for (const h of candidates) {
    const v = headers[h] ?? headers[h.toLowerCase()]
    if (typeof v === 'string') return v.split(',')[0].trim()
    if (Array.isArray(v) && v[0]) return v[0].split(',')[0].trim()
  }
  return 'unknown'
}
