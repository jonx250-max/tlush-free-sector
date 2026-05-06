/**
 * Stage C C1 — admin endpoint enforcement test.
 *
 * Walks every file under `api/admin/**` (excluding *.test.ts) and asserts
 * that each handler imports + invokes `requireAdmin()` before returning.
 * Fails CI the moment someone adds an admin route without the gate, even
 * if no human notices in code review.
 *
 * Today there are zero admin endpoints; the test passes vacuously, but
 * the moment one is created the test will catch a missed import.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('C1 — admin endpoint enforcement', () => {
  const adminDir = join(process.cwd(), 'api', 'admin')
  const files = walk(adminDir)

  it('admin folder exists or is intentionally absent', () => {
    // Vacuously passes today; flips to a real assertion the moment
    // someone creates the folder.
    expect(Array.isArray(files)).toBe(true)
  })

  for (const file of files) {
    it(`${file.replace(process.cwd(), '')} imports + calls requireAdmin`, () => {
      const src = readFileSync(file, 'utf8')
      expect(src, `${file} must import requireAdmin from _lib/requireAdmin`).toMatch(
        /import\s+\{[^}]*\brequireAdmin\b[^}]*\}\s+from\s+['"][^'"]*_lib\/requireAdmin/,
      )
      expect(src, `${file} must call requireAdmin(...) somewhere`).toMatch(
        /\brequireAdmin\s*\(/,
      )
      // Crude ordering check: requireAdmin must appear before any
      // INSERT/UPDATE/DELETE/.from() call that would touch user data.
      const adminIdx = src.search(/\brequireAdmin\s*\(/)
      const writeIdx = src.search(/\.(from|rpc)\s*\(|INSERT|UPDATE|DELETE/)
      if (writeIdx > -1) {
        expect(adminIdx, `${file} must call requireAdmin BEFORE any DB write`).toBeLessThan(writeIdx)
      }
    })
  }
})
