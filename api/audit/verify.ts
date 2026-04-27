/**
 * GET /api/audit/verify?case_id=xxx | ?user_id=xxx
 *
 * Returns the audit chain for a case or user + verification status.
 * Auth required. Users see only their own; admins see any.
 */

import { createClient } from '@supabase/supabase-js'
import { verifyChain, type AuditEntry } from '../../src/lib/auditLog.js'
import { isGeoAllowed } from '../_lib/geoCheck.js'

interface VercelRequest {
  method: string
  query: Record<string, string | string[] | undefined>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return res.status(500).json({ error: 'Supabase env vars missing' })

  const auth = req.headers.authorization
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: userErr } = await client.auth.getUser()
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const caseId = typeof req.query.case_id === 'string' ? req.query.case_id : null
  const targetUserId = typeof req.query.user_id === 'string' ? req.query.user_id : null

  // Admin gate: cross-user queries (?user_id=other) require is_admin=true.
  // Without this, RLS still scopes results but a leaked admin token could
  // read others' audit trails. Belt-and-braces.
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' })
    }
  }

  let query = client.from('audit_log').select('*').order('id', { ascending: true })
  if (caseId) query = query.eq('case_id', caseId)
  else if (targetUserId) query = query.eq('user_id', targetUserId)
  else query = query.eq('user_id', user.id)

  const { data: entries, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const result = await verifyChain((entries ?? []) as AuditEntry[])
  return res.status(200).json({
    entries: entries ?? [],
    intact: result.intact,
    brokenAtIndex: result.brokenAtIndex ?? null,
  })
}
