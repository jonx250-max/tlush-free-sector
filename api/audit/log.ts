/**
 * POST /api/audit/log
 *
 * Server-side append to `audit_log` with SHA-256 hash chain.
 * Authenticated via Bearer token (Supabase session JWT).
 *
 * The actual SELECT-prev / hash / INSERT happens inside the Postgres
 * function `audit_log_append()` under an advisory lock so concurrent
 * calls cannot fork the chain. The function also enforces case_id
 * ownership against `analysis_runs.user_id`.
 *
 * Body: { action: string, payload?: object|null, case_id?: string|null }
 * Returns: { id, hash } | { error }
 */

import { createClient } from '@supabase/supabase-js'
import { isGeoAllowed } from '../_lib/geoCheck.js'
import { safeError, logServerError } from '../_lib/safeError.js'
import { getServerConfig } from '../_lib/serverConfig.js'

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

  const cfg = getServerConfig().supabase
  const url = cfg.url
  const serviceKey = cfg.serviceRoleKey
  const anonKey = cfg.anonKey
  if (!url || !serviceKey || !anonKey) {
    return res.status(500).json({ error: 'Service unavailable', code: 'CONFIG_MISSING' })
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

  if (caseId !== null && (typeof caseId !== 'string' || caseId.length > 128)) {
    return res.status(400).json({ error: 'Invalid case_id' })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Single atomic RPC: lock + read prev_hash + compute + insert + ownership check.
  // Replaces the prior SELECT-then-INSERT race condition that allowed forks.
  const { data, error } = await admin.rpc('audit_log_append', {
    p_user_id: user.id,
    p_case_id: caseId,
    p_action: action,
    p_payload: payload,
  })

  if (error) {
    // 42501 = case_id ownership mismatch (raised by the function)
    if (error.code === '42501' || error.message?.includes('ownership mismatch')) {
      return res.status(403).json({ error: 'Forbidden', code: 'CASE_ID_FORBIDDEN' })
    }
    if (error.code === '22023' || error.message?.includes('required') || error.message?.includes('invalid')) {
      return res.status(400).json({ error: 'Invalid request', code: 'INVALID_INPUT' })
    }
    logServerError('audit_log_append failed', error)
    return res.status(500).json(safeError('AUDIT_INSERT_FAILED'))
  }

  const result = data as { id: number; hash: string }
  return res.status(200).json({ id: result.id, hash: result.hash })
}
