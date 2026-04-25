// Routes findings → recommended escalation action.
// Sliced by total gap + severity. Conservative defaults to avoid
// pushing users into court for minor disputes.

export type EscalationAction =
  | 'self_resolve'        // contact employer directly, no documentation needed
  | 'demand_letter_draft' // generate template demand letter (Premium tier)
  | 'lawyer_consult'      // recommend bar association referral
  | 'court_filing'        // labor tribunal recommended

export interface DisputeFinding {
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  gapAmountNis: number
  monthsAffected: number
}

export interface DisputeRecommendation {
  action: EscalationAction
  totalGapNis: number
  highestSeverity: DisputeFinding['severity']
  reasoning: string
  estimatedTimelineWeeks: { min: number; max: number }
  warnings: string[]
}

const SEVERITY_RANK: Record<DisputeFinding['severity'], number> = {
  low: 1, medium: 2, high: 3, critical: 4,
}

export function recommendEscalation(findings: DisputeFinding[]): DisputeRecommendation {
  if (findings.length === 0) {
    return zeroFindings()
  }

  const totalGap = findings.reduce((s, f) => s + f.gapAmountNis, 0)
  const highest = findings.reduce(
    (max, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max] ? f.severity : max),
    'low' as DisputeFinding['severity']
  )

  const action = pickAction(totalGap, highest, findings)
  const timeline = estimateTimeline(action)
  const warnings = collectWarnings(findings, action)

  return {
    action,
    totalGapNis: Math.round(totalGap),
    highestSeverity: highest,
    reasoning: explainAction(action, totalGap, highest),
    estimatedTimelineWeeks: timeline,
    warnings,
  }
}

function pickAction(gap: number, severity: DisputeFinding['severity'], findings: DisputeFinding[]): EscalationAction {
  if (severity === 'critical' || gap >= 50000) return 'court_filing'
  if (severity === 'high' || gap >= 10000) return 'lawyer_consult'
  if (gap >= 1000 || findings.some(f => f.monthsAffected >= 3)) return 'demand_letter_draft'
  return 'self_resolve'
}

function estimateTimeline(action: EscalationAction): { min: number; max: number } {
  switch (action) {
    case 'self_resolve': return { min: 1, max: 4 }
    case 'demand_letter_draft': return { min: 2, max: 8 }
    case 'lawyer_consult': return { min: 4, max: 16 }
    case 'court_filing': return { min: 24, max: 78 }
  }
}

function collectWarnings(findings: DisputeFinding[], action: EscalationAction): string[] {
  const w: string[] = []
  if (action === 'court_filing') {
    w.push('סף תביעה בבית הדין לעבודה: ייצוג עו"ד לרוב נדרש')
    w.push('עלות אגרת תביעה ≈ ₪1,054 (2026)')
  }
  if (findings.some(f => f.monthsAffected >= 12)) {
    w.push('התיישנות: תביעות עבודה — 7 שנים לרוב הפערים')
  }
  return w
}

function explainAction(action: EscalationAction, gap: number, severity: string): string {
  return `ההמלצה: ${action} (פער מצטבר ₪${gap}, חומרה ${severity})`
}

function zeroFindings(): DisputeRecommendation {
  return {
    action: 'self_resolve', totalGapNis: 0, highestSeverity: 'low',
    reasoning: 'לא נמצאו פערים — אין צורך בפעולה',
    estimatedTimelineWeeks: { min: 0, max: 0 }, warnings: [],
  }
}
