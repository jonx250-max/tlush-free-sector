/**
 * Audit log client + pure hash chain logic.
 *
 * Server-side append (api/audit/log.ts) computes the hash chain.
 * Client-side this module:
 *   - exposes log(action, payload) → POSTs to server endpoint
 *   - exposes pure hash functions used by both client tests + server
 *
 * Hash chain spec (legal-grade):
 *   hash = sha256(prev_hash + action + JSON.stringify(payload) + iso_timestamp + user_id)
 *
 * Genesis entry: prev_hash = 'genesis'
 * Tamper detection: re-run computeHash for each entry; mismatch = chain broken.
 */

import { supabase } from './supabase.js'

export interface AuditEntry {
  id?: number
  user_id: string | null
  case_id: string | null
  action: string
  payload: Record<string, unknown> | null
  prev_hash: string
  hash: string
  created_at: string
}

export interface AuditEntryInput {
  user_id: string | null
  case_id?: string | null
  action: string
  payload?: Record<string, unknown> | null
  prev_hash: string
  created_at: string
}

const GENESIS_HASH = 'genesis'

export async function computeHash(entry: AuditEntryInput): Promise<string> {
  const canonical =
    entry.prev_hash +
    '|' +
    entry.action +
    '|' +
    JSON.stringify(entry.payload ?? null) +
    '|' +
    entry.created_at +
    '|' +
    (entry.user_id ?? 'anonymous')

  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

export async function verifyChain(entries: AuditEntry[]): Promise<{
  intact: boolean
  brokenAtIndex?: number
}> {
  if (entries.length === 0) return { intact: true }

  let expectedPrev = GENESIS_HASH
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.prev_hash !== expectedPrev) return { intact: false, brokenAtIndex: i }
    const recomputed = await computeHash({
      user_id: e.user_id,
      case_id: e.case_id,
      action: e.action,
      payload: e.payload,
      prev_hash: e.prev_hash,
      created_at: e.created_at,
    })
    if (recomputed !== e.hash) return { intact: false, brokenAtIndex: i }
    expectedPrev = e.hash
  }

  return { intact: true }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const HASH_CHAIN_GENESIS = GENESIS_HASH

/**
 * Client-side: log an action via the server endpoint.
 * Server enforces hash chain integrity and inserts via service role.
 *
 * Falls back to a no-op if the audit endpoint is not reachable
 * (e.g. local dev without Vercel Functions deployed).
 */
export async function logAuditAction(
  action: string,
  payload?: Record<string, unknown>,
  options?: { caseId?: string }
): Promise<void> {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  try {
    await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload: payload ?? null, case_id: options?.caseId ?? null }),
    })
  } catch {
    // Audit failures must never break user-facing flows. Server-side
    // monitoring (error_logs) catches the gap.
  }
}
