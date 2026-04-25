// NII (Bituach Leumi) maternity benefit calculator.
// SOURCE: ח"ב לביטוח לאומי (גרסת 2026), פסיקת בית הדין לעבודה
// Eligibility: at least 10 of 14 OR 15 of 22 months prior to event paid into NII.

export type MaternityEventType =
  | 'birth_mother'   // 15 weeks fully paid (was 14, increased per amendment 2017)
  | 'partner'        // 8 days (paid by employer or NII per agreement)
  | 'adoption'       // up to 12 weeks
  | 'foster'         // up to 6 weeks

export interface MaternityInput {
  eventType: MaternityEventType
  eventDate: string // ISO
  monthsInsuredLast14: number
  monthsInsuredLast22: number
  avgGrossLast3Months: number
  isMultipleBirth?: boolean // twins+ extends by 3 weeks per child
  childrenCount?: number
}

export interface MaternityResult {
  eligible: boolean
  weeksEntitled: number
  daysEntitled: number
  dailyBenefitNis: number
  totalBenefitNis: number
  capApplied: boolean
  note: string
}

// 2026 NII daily cap (max insurable salary / 30)
const NII_DAILY_CAP_2026 = 1546 // ₪

const WEEKS_BY_TYPE: Record<MaternityEventType, number> = {
  birth_mother: 15, partner: 0 /* 8 days = 1.14 weeks */, adoption: 12, foster: 6,
}

export function calculateMaternityBenefit(input: MaternityInput): MaternityResult {
  const eligible =
    input.monthsInsuredLast14 >= 10 || input.monthsInsuredLast22 >= 15

  if (!eligible) {
    return {
      eligible: false, weeksEntitled: 0, daysEntitled: 0,
      dailyBenefitNis: 0, totalBenefitNis: 0, capApplied: false,
      note: 'לא עומד בתנאי הזכאות (פחות מ-10/14 או 15/22 חודשי ביטוח)',
    }
  }

  let weeks = WEEKS_BY_TYPE[input.eventType]
  if (input.eventType === 'partner') weeks = 8 / 7 // 8 days
  if (input.eventType === 'birth_mother' && input.isMultipleBirth && input.childrenCount && input.childrenCount > 1) {
    weeks += 3 * (input.childrenCount - 1)
  }

  const days = Math.round(weeks * 7)
  const dailyAvg = input.avgGrossLast3Months / 30
  const capApplied = dailyAvg > NII_DAILY_CAP_2026
  const dailyBenefit = Math.min(dailyAvg, NII_DAILY_CAP_2026)
  const total = Math.round(dailyBenefit * days)

  return {
    eligible: true,
    weeksEntitled: weeks,
    daysEntitled: days,
    dailyBenefitNis: Math.round(dailyBenefit),
    totalBenefitNis: total,
    capApplied,
    note: capApplied ? 'הוחלה תקרת השכר היומית של ב.ל.' : 'תקין',
  }
}
