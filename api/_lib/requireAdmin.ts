/**
 * Server-side admin gate for sensitive endpoints.
 *
 * The pattern in this repo for user-owned endpoints is: create a
 * Supabase client with the user's bearer token + anon key, then trust
 * RLS to scope reads/writes to that user. That works for self-service
 * data but NOT for admin actions, where:
 *
 *   1. The action affects other users' data (e.g. flagging an account,
 *      reading the global audit log) so per-user RLS doesn't help.
 *   2. Client UI (`AdminRoute.tsx`) gates by reading `profiles.is_admin`,
 *      but a forged client can call the endpoint directly. The is_admin
 *      flag MUST be re-checked server-side on every admin call.
 *
 * Usage:
 *
 *     export default async function handler(req, res) {
 *       const gate = await requireAdmin(req)
 *       if (!gate.ok) return res.status(gate.status).json(gate.body)
 *       // gate.user is the authenticated admin's auth.users row
 *       ...
 *     }
 *
 * No endpoint in this repo currently requires admin. This helper is
 * staged for the first one (planned: GET /api/admin/audit-summary,
 * GET /api/admin/users). Adding it now means future callers reach for
 * the helper instead of re-implementing the gate inconsistently.
 */

import { createClient } from '@supabase/supabase-js'
import { getServerConfig } from './serverConfig.js'

interface AdminRequest {
  headers: Record<string, string | string[] | undefined>
}

interface AdminGateOk {
  ok: true
  user: { id: string; email: string | null }
}

interface AdminGateDeny {
  ok: false
  status: 401 | 403 | 500
  body: { error: string; code: string }
}

export type AdminGate = AdminGateOk | AdminGateDeny

export async function requireAdmin(req: AdminRequest): Promise<AdminGate> {
  const cfg = getServerConfig().supabase
  const url = cfg.url
  const serviceKey = cfg.serviceRoleKey
  const anonKey = cfg.anonKey
  if (!url || !serviceKey || !anonKey) {
    return { ok: false, status: 500, body: { error: 'Service unavailable', code: 'CONFIG_MISSING' } }
  }

  const auth = req.headers.authorization
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return { ok: false, status: 401, body: { error: 'Missing bearer token', code: 'NO_TOKEN' } }
  }

  // 1. Validate the token resolves to a real auth.users row using the
  //    user's own JWT (so an attacker can't supply someone else's user
  //    id and have the lookup succeed).
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return { ok: false, status: 401, body: { error: 'Invalid session', code: 'INVALID_SESSION' } }
  }

  // 2. Re-check is_admin via the service-role key. Bypasses RLS so the
  //    policy can stay tight (users can read their own profile but not
  //    enumerate the admin set) while the server still gets a truthful
  //    answer. The user_id we look up is the one Supabase resolved from
  //    the JWT in step 1, NOT a value from the request body.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr || !profile || (profile as { is_admin: boolean }).is_admin !== true) {
    return { ok: false, status: 403, body: { error: 'Admin only', code: 'NOT_ADMIN' } }
  }

  return { ok: true, user: { id: user.id, email: user.email ?? null } }
}
