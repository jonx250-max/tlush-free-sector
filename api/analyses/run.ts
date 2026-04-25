/**
 * POST /api/analyses/run
 *
 * Executes the analysis for a paid (or free) purchase.
 *
 * Body: {
 *   purchase_id: uuid
 *   payslip_ids: uuid[]   // length must match purchase.months_count
 * }
 *
 * Flow:
 *   1. Verify purchase status='paid' AND owned by caller
 *   2. Verify payslips count matches months_count
 *   3. Run checks per tier (P6 wires actual check execution)
 *   4. Strip gap amounts if depth_tier='free'
 *   5. INSERT into checks table
 *   6. INSERT audit_log entry
 *   7. Return findings
 */

import { createClient } from '@supabase/supabase-js'
import { checksForTier, type DepthTier } from '../../src/services/checkRegistry'
import { computeHash, HASH_CHAIN_GENESIS } from '../../src/lib/auditLog'
import { isGeoAllowed } from '../_lib/geoCheck'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body: { purchase_id?: string; payslip_ids?: string[] }
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

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

  const purchaseId = req.body?.purchase_id
  const payslipIds = req.body?.payslip_ids
  if (!purchaseId || !Array.isArray(payslipIds)) {
    return res.status(400).json({ error: 'purchase_id and payslip_ids required' })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Verify purchase
  const { data: purchase, error: pErr } = await admin
    .from('analyses_purchases')
    .select('*')
    .eq('id', purchaseId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pErr || !purchase) return res.status(404).json({ error: 'Purchase not found' })
  if (purchase.status !== 'paid') return res.status(403).json({ error: 'Purchase not paid', status: purchase.status })
  if (payslipIds.length !== purchase.months_count) {
    return res.status(400).json({ error: `Expected ${purchase.months_count} payslips, got ${payslipIds.length}` })
  }

  // Verify payslips owned by user
  const { data: payslips } = await admin
    .from('payslips')
    .select('*')
    .in('id', payslipIds)
    .eq('user_id', user.id)

  if (!payslips || payslips.length !== payslipIds.length) {
    return res.status(404).json({ error: 'One or more payslips not found' })
  }

  const tier = purchase.depth_tier as DepthTier
  const checkIds = checksForTier(tier)

  // P6 will replace this stub with actual check execution via diffEngine + new calculators.
  // For P5: return empty findings + meta describing planned execution.
  const findings: unknown[] = []
  const totalGap = 0

  const { data: check, error: cErr } = await admin
    .from('checks')
    .insert({
      user_id: user.id,
      purchase_id: purchaseId,
      payslip_id: payslipIds[0],
      depth_tier_snapshot: tier,
      months_analyzed: purchase.months_count,
      results: { findings, plannedChecks: checkIds, status: 'pending_p6_execution' },
      total_gap_nis: totalGap,
    })
    .select('id')
    .single()

  if (cErr) return res.status(500).json({ error: cErr.message })

  // Audit log
  const { data: latest } = await admin
    .from('audit_log')
    .select('hash')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prevHash = latest?.hash ?? HASH_CHAIN_GENESIS
  const createdAt = new Date().toISOString()
  const auditPayload = { check_id: check.id, tier, payslip_count: payslipIds.length }
  const hash = await computeHash({
    user_id: user.id,
    action: 'ANALYSIS_RUN',
    payload: auditPayload,
    prev_hash: prevHash,
    created_at: createdAt,
  })

  await admin.from('audit_log').insert({
    user_id: user.id,
    action: 'ANALYSIS_RUN',
    payload: auditPayload,
    prev_hash: prevHash,
    hash,
    created_at: createdAt,
  })

  // Increment analyses_consumed counter
  await admin
    .from('analyses_purchases')
    .update({ analyses_consumed: purchase.analyses_consumed + 1 })
    .eq('id', purchaseId)

  return res.status(200).json({
    check_id: check.id,
    tier,
    findings,
    total_gap_nis: totalGap,
    note: 'P5 stub — actual check execution wired in P6',
  })
}
