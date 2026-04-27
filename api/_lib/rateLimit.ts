/**
 * Persistent sliding-window rate limiter backed by Postgres.
 *
 * Calls the `public.rate_limit_check(key, limit, window_seconds)` RPC
 * which atomically increments a bucket and returns the current count.
 * Survives Vercel cold starts (every fresh function instance hits the
 * same DB row, so attackers can't reset the counter by waiting for a
 * redeploy or by spreading requests across regions).
 *
 * Falls back to a per-instance in-memory Map if Supabase env vars
 * aren't set (local dev without service role) — graceful degradation.
 *
 * Async signature change from the previous sync version. All callers
 * must `await` the result.
 *
 * Usage:
 *   const result = await rateLimit({ key: ip, limit: 30, windowMs: 60_000 })
 *   if (!result.allowed) return res.status(429).json({ ... })
 */

import { createClient } from '@supabase/supabase-js'

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

interface MemoryBucket {
  hits: number[]
}

const MEMORY_STORE = new Map<string, MemoryBucket>()
const MEMORY_MAX_KEYS = 10_000
let memoryLastSweep = 0

let cachedAdmin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (cachedAdmin) return cachedAdmin
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  cachedAdmin = createClient(url, serviceKey, { auth: { persistSession: false } })
  return cachedAdmin
}

export async function rateLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const admin = getAdmin()
  if (admin) {
    try {
      const windowSeconds = Math.max(1, Math.round(cfg.windowMs / 1000))
      const { data, error } = await admin.rpc('rate_limit_check', {
        p_key: cfg.key,
        p_limit: cfg.limit,
        p_window_seconds: windowSeconds,
      })
      if (!error && data && typeof data === 'object') {
        const row = data as { allowed: boolean; remaining: number; reset_at: string }
        return {
          allowed: row.allowed,
          remaining: row.remaining,
          resetAt: new Date(row.reset_at).getTime(),
        }
      }
      // RPC failed → fall through to memory fallback (don't block request on infra issue)
    } catch {
      // network error → fall through
    }
  }
  return memoryRateLimit(cfg)
}

function memoryRateLimit(cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  sweepMemoryIfNeeded(now)

  const bucket = MEMORY_STORE.get(cfg.key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter(ts => ts > now - cfg.windowMs)

  if (bucket.hits.length >= cfg.limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.hits[0] + cfg.windowMs }
  }

  bucket.hits.push(now)
  MEMORY_STORE.set(cfg.key, bucket)

  return { allowed: true, remaining: cfg.limit - bucket.hits.length, resetAt: now + cfg.windowMs }
}

function sweepMemoryIfNeeded(now: number) {
  if (now - memoryLastSweep < 60_000 && MEMORY_STORE.size < MEMORY_MAX_KEYS) return
  memoryLastSweep = now
  for (const [key, bucket] of MEMORY_STORE) {
    if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < now - 600_000) {
      MEMORY_STORE.delete(key)
    }
  }
}

export function _resetForTests() {
  MEMORY_STORE.clear()
  memoryLastSweep = 0
  cachedAdmin = null
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
