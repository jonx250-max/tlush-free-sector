/**
 * POST /api/telemetry/web-vitals — Stage G7 + I5
 *
 * Accepts Core Web Vital beacons from the client (sendBeacon-style).
 * Bodies are tiny JSON; we accept up to 4KB. Writes go through the
 * service-role client because the table's INSERT policy is `false`
 * (only the server may write).
 *
 * No bearer auth — landing page sends beacons before login. We protect
 * the endpoint via:
 *   - geo-block IL (existing geoCheck)
 *   - per-IP rate-limit (60 / min — generous; legit clients send 5)
 *   - shape validation via Zod
 *   - 4KB body cap
 */

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { isGeoAllowed } from '../_lib/geoCheck.js'
import { rateLimit, extractClientIp } from '../_lib/rateLimit.js'
import { safeError, logServerError } from '../_lib/safeError.js'
import { getServerConfig } from '../_lib/serverConfig.js'

const BodySchema = z.object({
  name: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']),
  value: z.number().nonnegative(),
  id: z.string().max(128).optional(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  url: z.string().max(512).optional(),
  ua: z.string().max(64).optional(),
  release: z.string().max(64).optional(),
}).strict()

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
  query?: Record<string, string | string[] | undefined>
}
interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) return res.status(403).json({ error: 'GEO_BLOCKED' })

  const ip = extractClientIp(req.headers)
  const rl = await rateLimit({ key: `wv:${ip}`, limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return res.status(429).json({ error: 'RATE_LIMITED' })

  const raw = typeof req.body === 'string' ? safeJson(req.body) : req.body
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_BODY' })

  const cfg = getServerConfig().supabase
  if (!cfg.url || !cfg.serviceRoleKey) {
    // Quiet drop — telemetry should never break the app.
    return res.status(204).json(null)
  }

  try {
    const admin = createClient(cfg.url, cfg.serviceRoleKey, { auth: { persistSession: false } })
    await admin.from('web_vitals_samples').insert({
      metric_name: parsed.data.name,
      metric_value: parsed.data.value,
      metric_rating: parsed.data.rating ?? null,
      metric_id: parsed.data.id ?? null,
      url_path: parsed.data.url ?? null,
      user_agent_class: parsed.data.ua ?? null,
      release_tag: parsed.data.release ?? null,
    })
    return res.status(204).json(null)
  } catch (err) {
    logServerError('web-vitals-insert', err)
    return res.status(500).json(safeError('INTERNAL'))
  }
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s) } catch { return null }
}
