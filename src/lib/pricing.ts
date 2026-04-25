// One-time per-payslip pricing matrix.
// Source: Dashboard.html lines 1088-1100 in talush-package.
// Plan §2.5: Pro and Premium run same 28 base checks; Premium adds
// 4 exclusive checks + deliverables (letter, rights, bot).
// Formula: total = pricePerUnit × months × (1 - discount)

export type DepthTier = 'free' | 'basic' | 'pro' | 'premium'
export type MonthsCount = 1 | 3 | 6 | 12

export interface DepthInfo {
  tier: DepthTier
  pricePerUnitNis: number
  description: string
}

export interface VolumeInfo {
  months: MonthsCount
  discountPct: number
  label: string
}

export const DEPTH_INFO: Record<Exclude<DepthTier, 'free'>, DepthInfo> = {
  basic: {
    tier: 'basic',
    pricePerUnitNis: 8,
    description: '14 בדיקות בסיסיות + דוח PDF',
  },
  pro: {
    tier: 'pro',
    pricePerUnitNis: 10,
    description: '29 בדיקות + פרופיל מס + מטריצת סנכרון',
  },
  premium: {
    tier: 'premium',
    pricePerUnitNis: 14,
    description: '29 בדיקות + מכתב דרישה + מרכז זכאויות + עוזר חכם',
  },
}

export const VOLUME_INFO: Record<MonthsCount, VolumeInfo> = {
  1: { months: 1, discountPct: 0, label: 'תלוש בודד' },
  3: { months: 3, discountPct: 10, label: 'רבעון (3 חודשים)' },
  6: { months: 6, discountPct: 17, label: 'חצי שנה (6 חודשים)' },
  12: { months: 12, discountPct: 25, label: 'שנה מלאה (12 חודשים)' },
}

export interface PriceCalculation {
  tier: DepthTier
  months: MonthsCount
  pricePerUnitNis: number
  discountPct: number
  baseTotalNis: number
  totalNis: number
  perUnitAfterDiscountNis: number
}

export function calculatePrice(tier: DepthTier, months: MonthsCount): PriceCalculation {
  if (tier === 'free') {
    return {
      tier, months, pricePerUnitNis: 0, discountPct: 0,
      baseTotalNis: 0, totalNis: 0, perUnitAfterDiscountNis: 0,
    }
  }

  const depth = DEPTH_INFO[tier]
  const volume = VOLUME_INFO[months]
  const baseTotal = depth.pricePerUnitNis * months
  const discount = volume.discountPct / 100
  const total = baseTotal * (1 - discount)

  return {
    tier,
    months,
    pricePerUnitNis: depth.pricePerUnitNis,
    discountPct: volume.discountPct,
    baseTotalNis: baseTotal,
    totalNis: round2(total),
    perUnitAfterDiscountNis: round2(total / months),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function isValidMonths(n: number): n is MonthsCount {
  return n === 1 || n === 3 || n === 6 || n === 12
}

export function isValidTier(t: string): t is DepthTier {
  return t === 'free' || t === 'basic' || t === 'pro' || t === 'premium'
}
