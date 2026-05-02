/**
 * Stage C C11 — Right-to-be-forgotten endpoint.
 *
 * DELETE /api/account/forget
 *
 * Hard-deletes the caller's user-data rows across every table that
 * stores PII. Anonymizes the profile in place (zeroing personal info)
 * rather than deleting the row, because the row is FK-referenced by
 * audit_log and other immutable history.
 *
 * Audit log: a final `ACCOUNT_PURGED` entry is appended via the same
 * hash-chain RPC as every other event. Payload contains only counts of
 * deleted rows — no PII — so the chain stays useful for future audits
 * even after the user is gone.
 *
 * Scope intentionally narrow for this stage:
 *   - hard delete now (no 30-day soft window — Stage C+1 work)
 *   - leaves auth.users itself; deleting requires an admin-side cron
 *     because Supabase doesn't expose it via service-role from a
 *     Function reliably.
 *
 * Body: none. Returns: { ok: true, deletedCounts: {...} } | { error }
 */

import { createClient } from '@supabase/supabase-js'
import { isGeoAllowed } from '../_lib/geoCheck.js'
import { safeError, logServerError } from '../_lib/safeError.js'
import { getServerConfig } from '../_lib/serverConfig.js'
import { userRateLimit, POLICY } from '../_lib/userRateLimit.js'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

const PURGE_TABLES = [
  'analysis_findings',
  'demand_letters',
  'checks',
  'analysis_runs',
  'analyses_purchases',
  'free_tier_usage',
  'payslips',
  'contracts',
] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const cfg = getServerConfig().supabase
  if (!cfg.url || !cfg.anonKey || !cfg.serviceRoleKey) {
    return res.status(500).json({ error: 'Service unavailable', code: 'CONFIG_MISSING' })
  }

  const auth = req.headers.authorization
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  // Resolve the user from their own JWT (do not trust request body).
  const userClient = createClient(cfg.url, cfg.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  // Stage C C6 — per-user rate-limit (1 / 24h). Catastrophic mistake
  // mitigation: even if the UI accidentally double-fires, only the first
  // call wins.
  const rl = await userRateLimit({
    userId: user.id,
    endpoint: 'account-forget',
    ...POLICY.ACCOUNT_FORGET,
  })
  if (!rl.allowed) {
    return res.status(429).json({
      error: 'בקשת מחיקה כבר התקבלה היום',
      code: 'USER_RATE_LIMITED',
      resetAt: rl.resetAt,
    })
  }

  const admin = createClient(cfg.url, cfg.serviceRoleKey, { auth: { persistSession: false } })

  const deletedCounts: Record<string, number> = {}
  try {
    for (const table of PURGE_TABLES) {
      const { count, error } = await admin
        .from(table)
        .delete({ count: 'exact' })
        .eq('user_id', user.id)
      if (error) {
        logServerError(`forget-purge-${table}`, error)
        return res.status(500).json(safeError('PURGE_FAILED'))
      }
      deletedCounts[table] = count ?? 0
    }

    // Anonymize the profile row in place — keep the FK target alive so
    // audit_log + analyses_purchases (already deleted but the FK column
    // would otherwise dangle in any retained row).
    await admin.from('profiles').update({
      full_name: null,
      avatar_url: null,
      phone_number: null,
      personal_info: null,
      employment_info: null,
    }).eq('id', user.id)

    // Append a hash-chained audit event marking the purge. Payload
    // contains only the counts so the chain stays meaningful.
    await admin.rpc('audit_log_append', {
      p_user_id: user.id,
      p_case_id: null,
      p_action: 'ACCOUNT_PURGED',
      p_payload: { deletedCounts },
    })

    return res.status(200).json({ ok: true, deletedCounts })
  } catch (err) {
    logServerError('forget-handler', err)
    return res.status(500).json(safeError('PURGE_FAILED'))
  }
}
