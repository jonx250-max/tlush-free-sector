/**
 * Stage D D4 — RLS coverage audit.
 *
 * Walks SQL migrations and asserts every public.* table runs
 * `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Static, offline check;
 * the migration test harness (D6) does the live apply loop.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

const EXEMPT: { table: string; reason: string }[] = []

function loadAll(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
  return files.map(f => readFileSync(join(MIGRATIONS_DIR, f), 'utf8')).join('\n\n')
}

describe('D4 — RLS coverage audit', () => {
  const sql = loadAll()
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi
  const tables = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(sql))) tables.add(m[1])

  it('found at least one public table', () => {
    expect(tables.size).toBeGreaterThan(0)
  })

  for (const table of tables) {
    const exempt = EXEMPT.find(e => e.table === table)
    if (exempt) {
      it(`${table} (exempt — ${exempt.reason})`, () => {
        expect(exempt.reason).toBeTruthy()
      })
      continue
    }
    it(`${table} has RLS enabled`, () => {
      const rls = new RegExp(
        `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i',
      )
      expect(sql, `public.${table} must enable RLS`).toMatch(rls)
    })
  }
})
