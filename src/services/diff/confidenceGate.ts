/**
 * Stage E10 + E12 — confidence-based severity gate.
 *
 * If a contract field's extraction confidence is below the threshold,
 * demote a finding's severity by one tier (critical → warning → info)
 * and append an explanatory note. Avoids the case where the diff engine
 * fires a CRITICAL "underpaid" alert that turned out to be triggered
 * by a parser miss on the contract side.
 *
 * Stage H will add UI to surface needs-review affordances; this layer
 * just ensures the data isn't lying.
 */

import type { ExtractedField, Severity } from '../../types'

export const CONFIDENCE_HARD_GATE = 0.7
export const CONFIDENCE_SOFT_GATE = 0.5

const TIER_DOWN: Record<Severity, Severity> = {
  critical: 'warning',
  warning: 'info',
  info: 'info',
}

export function downgradeForConfidence<T>(
  field: ExtractedField<T>,
  severity: Severity,
): { severity: Severity; note: string } {
  if (field.confidence >= CONFIDENCE_HARD_GATE) {
    return { severity, note: '' }
  }
  if (field.confidence < CONFIDENCE_SOFT_GATE) {
    // Very low confidence — demote two tiers (cap at info).
    return {
      severity: 'info',
      note: ` (זוהה בחוזה בביטחון נמוך — ${(field.confidence * 100).toFixed(0)}%)`,
    }
  }
  // Soft gate — demote one tier.
  return {
    severity: TIER_DOWN[severity],
    note: ` (זוהה בחוזה בביטחון בינוני — ${(field.confidence * 100).toFixed(0)}%)`,
  }
}
