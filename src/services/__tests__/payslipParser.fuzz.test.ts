/**
 * Stage B B8 — fuzz `parsePayslipText` against malformed input.
 *
 * Properties asserted:
 *   1. Never throws — any string input produces a ParsedPayslip
 *   2. Numeric fields are finite or null (no NaN, no Infinity)
 *   3. Month is 1-12; year is reasonable (1990-2100)
 *   4. entries[] is an array (possibly empty)
 *   5. Hebrew/RTL/control-char input does not break parsing
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parsePayslipText } from '../payslipParser'
import type { ParsedPayslip } from '../../types'

const NUMERIC_FIELDS: (keyof ParsedPayslip)[] = [
  'grossSalary', 'netSalary', 'basePay', 'overtimePay', 'overtimeHours',
  'globalOvertimeLine', 'commissionPay', 'bonusPay', 'travelAllowance',
  'mealAllowance', 'phoneAllowance', 'sickPay', 'vacationPay', 'incomeTax',
  'nationalInsurance', 'healthInsurance', 'pensionEmployee', 'pensionEmployer',
  'kerenHishtalmutEmployee', 'kerenHishtalmutEmployer', 'severanceEmployer',
  'totalDeductions', 'totalEmployerCost',
]

function assertWellFormed(p: ParsedPayslip): void {
  expect(typeof p.month).toBe('number')
  expect(typeof p.year).toBe('number')
  expect(p.month).toBeGreaterThanOrEqual(1)
  expect(p.month).toBeLessThanOrEqual(12)
  expect(p.year).toBeGreaterThanOrEqual(1990)
  expect(p.year).toBeLessThanOrEqual(2100)
  expect(Array.isArray(p.entries)).toBe(true)
  for (const f of NUMERIC_FIELDS) {
    const v = p[f]
    if (v !== null) {
      expect(typeof v).toBe('number')
      expect(Number.isFinite(v as number)).toBe(true)
    }
  }
}

describe('B8 — payslip parser fuzz', () => {
  it('never throws on arbitrary unicode text', () => {
    fc.assert(fc.property(fc.unicodeString({ maxLength: 5000 }), text => {
      const result = parsePayslipText(text)
      assertWellFormed(result)
    }), { numRuns: 200 })
  })

  it('never throws on Hebrew + numeric noise', () => {
    const hebrewChar = fc.integer({ min: 0x0590, max: 0x05FF }).map(c => String.fromCharCode(c))
    const hebrewWord = fc.array(hebrewChar, { minLength: 1, maxLength: 8 }).map(a => a.join(''))
    const numericNoise = fc.oneof(
      fc.integer({ min: -10_000, max: 100_000 }).map(n => n.toString()),
      fc.float({ min: -1000, max: 100_000, noNaN: true, noDefaultInfinity: true })
        .map(n => n.toFixed(2)),
      fc.constantFrom('₪', 'ש"ח', 'שקלים', '%', '‎', '‏'),
    )
    const line = fc.array(fc.oneof(hebrewWord, numericNoise), { minLength: 1, maxLength: 12 })
      .map(parts => parts.join(' '))
    const text = fc.array(line, { minLength: 1, maxLength: 50 }).map(lines => lines.join('\n'))

    fc.assert(fc.property(text, t => {
      const result = parsePayslipText(t)
      assertWellFormed(result)
    }), { numRuns: 200 })
  })

  it('handles control characters and zero-width marks', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 200 }),
      fc.constantFrom('​', '‎', '‏', '‮', ' ', '\t', '\r\n'),
      (s, ctrl) => {
        const result = parsePayslipText(s + ctrl + s)
        assertWellFormed(result)
      },
    ), { numRuns: 100 })
  })

  it('handles empty + whitespace-only input', () => {
    for (const t of ['', ' ', '\n\n\n', '\t\t', '   ']) {
      const result = parsePayslipText(t)
      assertWellFormed(result)
      expect(result.entries.length).toBe(0)
    }
  })

  it('handles very long single-line input', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1000, maxLength: 5000 }),
      s => {
        const result = parsePayslipText(s)
        assertWellFormed(result)
      },
    ), { numRuns: 30 })
  })
})
