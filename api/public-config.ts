/**
 * GET /api/public-config
 * Returns Supabase URL + public anon key for client-side use.
 * These are designed-public credentials (RLS gates real access).
 *
 * P8 partial: enforces geo-block. Non-IL requests get 403 (with
 * invite-token bypass). Vercel sets x-vercel-ip-country header on
 * every Function request.
 */

import { isGeoAllowed } from './_lib/geoCheck.js'
import { getServerConfig } from './_lib/serverConfig.js'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (data: unknown) => void
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED', country: geo.country })
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getServerConfig().supabase

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Public config not set' })
  }

  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).json({ supabaseUrl, supabaseAnonKey })
}
