/**
 * POST /api/auth/otp-send
 *
 * Server-side proxy for Supabase phone-OTP send. Adds:
 *   1. Server-side phone normalization (Israeli +972 prefix, length check)
 *   2. Per-phone rate limit (3 OTPs / 10 min) via persistent rate limiter
 *   3. Geo-block check
 *
 * The client (auth-bridge.js) calls this instead of supabase.auth.signInWithOtp
 * directly. Supabase still sends the SMS — we just gate it.
 *
 * Body: { phone: string }
 * Returns: { ok: true, phone: '+972...' } | { error, code }
 */

import { isGeoAllowed } from '../_lib/geoCheck.js'
import { rateLimit, extractClientIp } from '../_lib/rateLimit.js'
import { safeError, logServerError } from '../_lib/safeError.js'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body: { phone?: string }
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

/**
 * Normalize an Israeli phone number to E.164 format. Accepts forms:
 *   '0501234567', '050-123-4567', '050 123 4567' → '+972501234567'
 *   '+972501234567' → unchanged
 *   '972501234567' → '+972501234567'
 *
 * Returns null if invalid.
 */
export function normalizeIsraeliPhone(input: string): string | null {
  if (typeof input !== 'string') return null
  const stripped = input.replace(/[\s\-()]/g, '')
  if (stripped.length < 9 || stripped.length > 15) return null

  let normalized: string
  if (stripped.startsWith('+972')) normalized = stripped
  else if (stripped.startsWith('972')) normalized = '+' + stripped
  else if (stripped.startsWith('0')) normalized = '+972' + stripped.slice(1)
  else return null

  if (!/^\+972[0-9]{8,9}$/.test(normalized)) return null
  return normalized
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  // Rate-limit per IP (10/min) to prevent enumeration even before phone normalization
  const ip = extractClientIp(req.headers)
  const rlIp = await rateLimit({ key: `otp-ip:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rlIp.allowed) {
    return res.status(429).json({ error: 'יותר מדי בקשות', code: 'RATE_LIMITED', resetAt: rlIp.resetAt })
  }

  const phoneRaw = req.body?.phone
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return res.status(400).json({ error: 'phone required' })
  }

  const phone = normalizeIsraeliPhone(phoneRaw)
  if (!phone) {
    return res.status(400).json({ error: 'מספר טלפון לא תקין', code: 'INVALID_PHONE' })
  }

  // Per-phone rate limit (3 OTPs / 10 min) — protects Supabase SMS spend
  // and prevents harassment of a phone number via the OTP channel.
  const rlPhone = await rateLimit({ key: `otp-phone:${phone}`, limit: 3, windowMs: 600_000 })
  if (!rlPhone.allowed) {
    return res.status(429).json({
      error: 'נשלחו יותר מדי קודים למספר זה. נסה שוב בעוד 10 דקות.',
      code: 'OTP_PHONE_RATE_LIMITED',
      resetAt: rlPhone.resetAt,
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return res.status(503).json({ error: 'Auth service unavailable', code: 'CONFIG_MISSING' })
  }

  // Forward to Supabase auth REST endpoint
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ phone, channel: 'sms' }),
    })

    if (!response.ok) {
      const text = await response.text()
      logServerError('otp-supabase-fail', { status: response.status, body: text })
      // Don't echo Supabase error to client — could leak existence of phone
      return res.status(500).json(safeError('OTP_SEND_FAILED'))
    }

    return res.status(200).json({ ok: true, phone })
  } catch (err) {
    logServerError('otp-fetch', err)
    return res.status(500).json(safeError('OTP_SEND_FAILED'))
  }
}
