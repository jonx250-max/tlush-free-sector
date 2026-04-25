/**
 * POST /api/analyses/create
 *
 * Creates a new analysis purchase (free or paid).
 * Free tier: atomic claim on free_tier_usage table (one per user/device/email).
 * Paid tier: insert into analyses_purchases (status=pending), return checkout
 *            URL (stubbed until Phase 10 Tranzila wiring).
 *
 * Body: {
 *   depth_tier: 'free' | 'basic' | 'pro' | 'premium'
 *   months_count: 1 | 3 | 6 | 12
 *   device_fingerprint: string  (client-side computed via freemium.ts)
 *   email_hash: string          (SHA-256 of normalized email)
 * }
 *
 * Returns: { id, checkout_url? } | { error, code }
 */

import { createClient } from '@supabase/supabase-js'
import { calculatePrice, isValidMonths, isValidTier } from '../../src/lib/pricing'
import { isGeoAllowed } from '../_lib/geoCheck'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body: {
    depth_tier?: string
    months_count?: number
    device_fingerprint?: string
    email_hash?: string
  }
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

const FREE_TIER_BLOCKED_CODES = {
  USER_USED: 'FREE_TIER_USED_BY_USER',
  DEVICE_USED: 'FREE_TIER_USED_BY_DEVICE',
  EMAIL_USED: 'FREE_TIER_USED_BY_EMAIL',
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) return res.status(500).json({ error: 'Supabase env vars missing' })

  const auth = req.headers.authorization
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const tier = req.body?.depth_tier
  const months = req.body?.months_count
  if (!tier || !isValidTier(tier)) return res.status(400).json({ error: 'Invalid depth_tier' })
  if (typeof months !== 'number' || !isValidMonths(months)) {
    return res.status(400).json({ error: 'Invalid months_count' })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  if (tier === 'free') {
    return handleFree(req, res, admin, user.id)
  }

  return handlePaid(res, admin, user.id, tier, months)
}

async function handleFree(
  req: VercelRequest,
  res: VercelResponse,
  admin: ReturnType<typeof createClient>,
  userId: string
) {
  const fingerprint = req.body?.device_fingerprint
  const emailHash = req.body?.email_hash
  if (!fingerprint || !emailHash) {
    return res.status(400).json({ error: 'device_fingerprint and email_hash required for free tier' })
  }

  // Atomic claim — INSERT will fail with unique constraint if already used
  const { error } = await admin.from('free_tier_usage').insert({
    user_id: userId,
    device_fingerprint: fingerprint,
    email_hash: emailHash,
  })

  if (error) {
    if (error.code === '23505') {
      // Map which constraint blocked
      let code: string = FREE_TIER_BLOCKED_CODES.USER_USED
      if (error.message.includes('device')) code = FREE_TIER_BLOCKED_CODES.DEVICE_USED
      else if (error.message.includes('email')) code = FREE_TIER_BLOCKED_CODES.EMAIL_USED
      return res.status(403).json({ error: 'Free tier already used', code })
    }
    return res.status(500).json({ error: error.message })
  }

  // Insert purchase row marked free (no payment required)
  const { data: purchase, error: insertErr } = await admin
    .from('analyses_purchases')
    .insert({
      user_id: userId,
      depth_tier: 'free',
      months_count: 1,
      total_amount_nis: 0,
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr) return res.status(500).json({ error: insertErr.message })

  return res.status(200).json({ id: purchase.id, checkout_url: null })
}

async function handlePaid(
  res: VercelResponse,
  admin: ReturnType<typeof createClient>,
  userId: string,
  tier: 'basic' | 'pro' | 'premium',
  months: 1 | 3 | 6 | 12
) {
  const price = calculatePrice(tier, months)

  const { data: purchase, error } = await admin
    .from('analyses_purchases')
    .insert({
      user_id: userId,
      depth_tier: tier,
      months_count: months,
      total_amount_nis: price.totalNis,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // P10 will replace this with Tranzila checkout-session URL
  return res.status(200).json({
    id: purchase.id,
    checkout_url: null,
    amount_nis: price.totalNis,
    note: 'Payment integration deferred to Phase 10 (Tranzila)',
  })
}
