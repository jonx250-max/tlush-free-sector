// Validates seniority calculation across workplace changes.
// SOURCE: חוק פיצויי פיטורים, פסיקת בית הדין לעבודה
// Key rule: "רציפות זכויות" applies if gap < 90 days OR same legal entity transfer.

export interface EmploymentSegment {
  employerId: string
  employerName: string
  startDate: string // ISO
  endDate: string | null // ISO or null if current
}

export interface SeniorityValidation {
  totalSeniorityDays: number
  totalSeniorityYears: number
  hasContinuity: boolean
  brokenSegments: { segment: EmploymentSegment; gapDays: number; reason: string }[]
  contractedSeniority: number | null
  isValid: boolean
}

const CONTINUITY_GAP_THRESHOLD_DAYS = 90

export function validateWorkplaceChanges(
  segments: EmploymentSegment[],
  contractedSeniorityDays: number | null = null
): SeniorityValidation {
  if (segments.length === 0) {
    return {
      totalSeniorityDays: 0, totalSeniorityYears: 0, hasContinuity: true,
      brokenSegments: [], contractedSeniority: contractedSeniorityDays, isValid: true,
    }
  }

  const sorted = [...segments].sort((a, b) => a.startDate.localeCompare(b.startDate))
  let totalDays = 0
  const broken: { segment: EmploymentSegment; gapDays: number; reason: string }[] = []

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i]
    const start = new Date(seg.startDate)
    const end = seg.endDate ? new Date(seg.endDate) : new Date()
    const segDays = Math.floor((end.getTime() - start.getTime()) / 86400000)
    totalDays += segDays

    if (i > 0) {
      const prev = sorted[i - 1]
      if (!prev.endDate) continue
      const prevEnd = new Date(prev.endDate)
      const gapDays = Math.floor((start.getTime() - prevEnd.getTime()) / 86400000)
      if (gapDays > CONTINUITY_GAP_THRESHOLD_DAYS && prev.employerId !== seg.employerId) {
        broken.push({
          segment: seg,
          gapDays,
          reason: `פער של ${gapDays} ימים בין מעסיקים — רציפות זכויות נשברה`,
        })
      }
    }
  }

  const isValid =
    contractedSeniorityDays === null ||
    Math.abs(totalDays - contractedSeniorityDays) <= 30

  return {
    totalSeniorityDays: totalDays,
    totalSeniorityYears: totalDays / 365,
    hasContinuity: broken.length === 0,
    brokenSegments: broken,
    contractedSeniority: contractedSeniorityDays,
    isValid,
  }
}
