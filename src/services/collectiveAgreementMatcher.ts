// Matches employer/sector to known collective agreements.
// STUB for P4: returns empty match. P7 wires to data/laws/collective_agreements/*.json
// once scraper backfills the registry from gov.il.

export interface CollectiveAgreement {
  id: string
  name: string
  sector: string
  effectiveFrom: string // ISO date
  terms: {
    minimumWageOverride?: number
    annualIncreasePct?: number
    extraVacationDays?: number
    pensionRateOverride?: { employee: number; employer: number }
  }
}

export interface AgreementMatch {
  matched: CollectiveAgreement | null
  confidence: number // 0-1
  reason: string
}

export function matchCollectiveAgreement(
  employerName: string | null,
  sector: string | null,
  registry: CollectiveAgreement[] = []
): AgreementMatch {
  if (!employerName && !sector) {
    return { matched: null, confidence: 0, reason: 'אין מידע על מעסיק/ענף' }
  }

  if (registry.length === 0) {
    return {
      matched: null, confidence: 0,
      reason: 'מאגר הסכמים קיבוציים עדיין לא נטען (P7 — auto-update pipeline)',
    }
  }

  const sectorMatch = sector
    ? registry.find(a => a.sector.toLowerCase() === sector.toLowerCase())
    : null

  if (sectorMatch) return { matched: sectorMatch, confidence: 0.85, reason: 'התאמה לפי ענף' }

  return { matched: null, confidence: 0, reason: 'לא נמצא הסכם קיבוצי תואם' }
}
