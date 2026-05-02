/**
 * Stage B B1 — law truth-table snapshot regression suite.
 *
 * Each archetypal scenario is snapshotted; any drift in calculator output
 * surfaces as a snapshot diff that must be explicitly approved (`npm test --
 * -u`). Tier-2 only — does NOT validate against statutory truth.
 * Tier-1 hand-validated cases land in Stage E.
 */

import { describe, it, expect } from 'vitest'
import { compare } from '../diffEngine'
import { buildScenario } from './builder'
import { SCENARIOS } from './scenarios'

describe('Law truth-tables — Tier 2 regression', () => {
  for (const spec of SCENARIOS) {
    it(spec.name, () => {
      const { contract, payslip, profile, year } = buildScenario(spec)
      const result = compare(contract, payslip, profile, year)

      // Snapshot the structured findings + summary; round numeric fields to
      // 2 decimals to immunize against IEEE-754 last-bit drift between Node
      // versions (Stage E item E6 will replace floats with Decimal).
      const stable = {
        findings: result.findings.map(f => ({
          ...f,
          contractValue: f.contractValue == null ? null : Math.round(f.contractValue * 100) / 100,
          payslipValue: f.payslipValue == null ? null : Math.round(f.payslipValue * 100) / 100,
          gap: Math.round(f.gap * 100) / 100,
        })),
        summary: {
          ...result.summary,
          totalGapAmount: Math.round(result.summary.totalGapAmount * 100) / 100,
        },
        overtimeAnalysis: {
          ...result.overtimeAnalysis,
          expectedPay: Math.round(result.overtimeAnalysis.expectedPay * 100) / 100,
          actualPay: Math.round(result.overtimeAnalysis.actualPay * 100) / 100,
          gap: Math.round(result.overtimeAnalysis.gap * 100) / 100,
          effectiveHourlyRate: Math.round(result.overtimeAnalysis.effectiveHourlyRate * 100) / 100,
        },
        taxAnalysis: {
          ...result.taxAnalysis,
          expectedTax: Math.round(result.taxAnalysis.expectedTax * 100) / 100,
          actualTax: Math.round(result.taxAnalysis.actualTax * 100) / 100,
          overcharge: Math.round(result.taxAnalysis.overcharge * 100) / 100,
          creditPointsValue: Math.round(result.taxAnalysis.creditPointsValue * 100) / 100,
          regionalBenefitValue: Math.round(result.taxAnalysis.regionalBenefitValue * 100) / 100,
        },
      }

      expect(stable).toMatchSnapshot()
    })
  }
})
