import { describe, it, expect } from 'vitest'
import { computeHash, verifyChain, HASH_CHAIN_GENESIS, type AuditEntry } from './auditLog'

const FIXED_TS = '2026-04-25T20:00:00.000Z'

describe('computeHash', () => {
  it('produces deterministic SHA-256 hex (64 chars)', async () => {
    const h = await computeHash({
      user_id: 'u1',
      action: 'LOGIN',
      payload: { method: 'password' },
      prev_hash: HASH_CHAIN_GENESIS,
      created_at: FIXED_TS,
    })
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('same input produces same hash', async () => {
    const input = {
      user_id: 'u1',
      action: 'LOGIN',
      payload: { method: 'password' },
      prev_hash: HASH_CHAIN_GENESIS,
      created_at: FIXED_TS,
    }
    const a = await computeHash(input)
    const b = await computeHash(input)
    expect(a).toBe(b)
  })

  it('different action yields different hash', async () => {
    const base = { user_id: 'u1', payload: null, prev_hash: HASH_CHAIN_GENESIS, created_at: FIXED_TS }
    const a = await computeHash({ ...base, action: 'LOGIN' })
    const b = await computeHash({ ...base, action: 'LOGOUT' })
    expect(a).not.toBe(b)
  })

  it('different payload yields different hash', async () => {
    const base = { user_id: 'u1', action: 'ANALYSIS_RUN', prev_hash: HASH_CHAIN_GENESIS, created_at: FIXED_TS }
    const a = await computeHash({ ...base, payload: { id: 1 } })
    const b = await computeHash({ ...base, payload: { id: 2 } })
    expect(a).not.toBe(b)
  })

  it('different prev_hash yields different hash (chain coupling)', async () => {
    const base = { user_id: 'u1', action: 'LOGIN', payload: null, created_at: FIXED_TS }
    const a = await computeHash({ ...base, prev_hash: 'genesis' })
    const b = await computeHash({ ...base, prev_hash: 'abc123' })
    expect(a).not.toBe(b)
  })

  it('null user_id maps to "anonymous" in canonical form', async () => {
    const base = { action: 'GEO_BLOCKED', payload: null, prev_hash: HASH_CHAIN_GENESIS, created_at: FIXED_TS }
    const a = await computeHash({ ...base, user_id: null })
    const b = await computeHash({ ...base, user_id: 'anonymous' })
    expect(a).toBe(b)
  })
})

describe('verifyChain', () => {
  async function makeChain(events: Array<{ action: string; payload?: Record<string, unknown> }>): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = []
    let prev = HASH_CHAIN_GENESIS
    for (let i = 0; i < events.length; i++) {
      const ts = new Date(Date.UTC(2026, 3, 25, 20, i, 0)).toISOString()
      const input = {
        user_id: 'u1',
        case_id: null,
        action: events[i].action,
        payload: events[i].payload ?? null,
        prev_hash: prev,
        created_at: ts,
      }
      const hash = await computeHash(input)
      entries.push({ id: i + 1, ...input, hash })
      prev = hash
    }
    return entries
  }

  it('empty chain is intact', async () => {
    const r = await verifyChain([])
    expect(r.intact).toBe(true)
  })

  it('valid 5-entry chain is intact', async () => {
    const chain = await makeChain([
      { action: 'SIGNUP' },
      { action: 'LOGIN' },
      { action: 'TAX_PROFILE_UPDATE', payload: { fields: ['gender', 'birthYear'] } },
      { action: 'PAYSLIP_UPLOAD', payload: { file_hash: 'abc' } },
      { action: 'ANALYSIS_RUN', payload: { check_id: '123' } },
    ])
    const r = await verifyChain(chain)
    expect(r.intact).toBe(true)
    expect(r.brokenAtIndex).toBeUndefined()
  })

  it('detects tampered hash mid-chain', async () => {
    const chain = await makeChain([
      { action: 'SIGNUP' },
      { action: 'LOGIN' },
      { action: 'PAYSLIP_UPLOAD' },
    ])
    chain[1].hash = 'tampered000000000000000000000000000000000000000000000000000000000'
    const r = await verifyChain(chain)
    expect(r.intact).toBe(false)
    expect(r.brokenAtIndex).toBe(1)
  })

  it('detects modified payload mid-chain', async () => {
    const chain = await makeChain([
      { action: 'LOGIN' },
      { action: 'PAYSLIP_UPLOAD', payload: { file_hash: 'original' } },
      { action: 'ANALYSIS_RUN' },
    ])
    chain[1].payload = { file_hash: 'modified' }
    const r = await verifyChain(chain)
    expect(r.intact).toBe(false)
    expect(r.brokenAtIndex).toBe(1)
  })

  it('detects broken prev_hash linkage', async () => {
    const chain = await makeChain([
      { action: 'SIGNUP' },
      { action: 'LOGIN' },
    ])
    chain[1].prev_hash = 'wrong-prev-hash'
    const r = await verifyChain(chain)
    expect(r.intact).toBe(false)
    expect(r.brokenAtIndex).toBe(1)
  })

  it('detects deleted entry (prev_hash mismatch on next)', async () => {
    const full = await makeChain([
      { action: 'SIGNUP' },
      { action: 'LOGIN' },
      { action: 'PAYSLIP_UPLOAD' },
      { action: 'ANALYSIS_RUN' },
    ])
    const tampered = [full[0], full[1], full[3]] // entry index 2 deleted
    const r = await verifyChain(tampered)
    expect(r.intact).toBe(false)
    expect(r.brokenAtIndex).toBe(2)
  })
})
