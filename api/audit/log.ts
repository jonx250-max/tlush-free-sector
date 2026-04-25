/**
 * POST /api/audit/log
 *
 * Server-side append to `audit_log` with SHA-256 hash chain.
 * Authenticated via Bearer token (Supabase session JWT).
 * Inserts via service role (bypasses RLS write blocks).
 *
 * Body: { action: string, payload?: object|null, case_id?: string|null }
 * Returns: { id, hash } | { error }
 */

import { createClient } from '@supabase/supabase-js'
import { computeHash, HASH_CHAIN_GENESIS } from '../../src/lib/auditLog'
import { isGeoAllowed } from '../_lib/geoCheck'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  body: { action?: string; payload?: Record<string, unknown> | null; case_id?: string | null }
  query?: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) {
    return res.status(500).json({ error: 'Supabase env vars missing' })
  }

  const auth = req.headers.authorization
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const action = req.body?.action
  if (!action || typeof action !== 'string' || action.length > 64) {
    return res.status(400).json({ error: 'Invalid action' })
  }

  const payload = (req.body?.payload ?? null) as Record<string, unknown> | null
  const caseId = req.body?.case_id ?? null

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Get prev_hash from latest audit_log entry (global chain across all users
  // for stronger collision resistance — entries are still RLS-isolated for reads)
  const { data: latest } = await admin
    .from('audit_log')
    .select('hash')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prev_hash = latest?.hash ?? HASH_CHAIN_GENESIS
  const created_at = new Date().toISOString()

  const hash = await computeHash({
    user_id: user.id,
    case_id: caseId,
    action,
    payload,
    prev_hash,
    created_at,
  })

  const { data: inserted, error: insertErr } = await admin
    .from('audit_log')
    .insert({
      user_id: user.id,
      case_id: caseId,
      action,
      payload,
      prev_hash,
      hash,
      created_at,
    })
    .select('id, hash')
    .single()

  if (insertErr) return res.status(500).json({ error: insertErr.message })

  return res.status(200).json({ id: inserted.id, hash: inserted.hash })
}
