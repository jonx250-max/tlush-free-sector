/**
 * Stage C C6 — per-user mutation rate-limit.
 *
 * Wraps the IP-based `rateLimit()` (`api/_lib/rateLimit.ts`) with a key
 * scoped to `user:<uid>:<endpoint>` so that abusive users can't cycle
 * through IPs to flood the system.
 *
 * Layered with per-IP limits, not a replacement: an attacker pivoting
 * across IPs still hits the per-user counter once they're authenticated.
 */

import { rateLimit, type RateLimitResult } from './rateLimit.js'

export interface UserRateLimitConfig {
  userId: string
  endpoint: string
  limit: number
  windowMs: number
}

export function userRateLimit(cfg: UserRateLimitConfig): Promise<RateLimitResult> {
  return rateLimit({
    key: `user:${cfg.userId}:${cfg.endpoint}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  })
}

// Common policy presets so handlers don't reinvent windows.
export const POLICY = {
  ANALYSES_CREATE: { limit: 50, windowMs: 24 * 60 * 60 * 1000 } as const,
  PROFILE_UPDATE: { limit: 30, windowMs: 60 * 60 * 1000 } as const,
  DEMAND_LETTER:  { limit: 10, windowMs: 24 * 60 * 60 * 1000 } as const,
  ACCOUNT_FORGET: { limit: 1,  windowMs: 24 * 60 * 60 * 1000 } as const,
}
