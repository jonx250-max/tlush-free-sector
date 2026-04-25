// Stock options + RSU vesting calculator.
// SOURCE: סעיף 102(ב) — מסלול הוני (capital track), 25% tax on capital gains.
// Two tracks: Capital (no tax until sale, 25%) vs Income (immediate tax at marginal).
// Most plans use Capital Track via trustee.

export type VestingTrack = 'capital' | 'income'

export interface OptionGrant {
  grantId: string
  grantDate: string // ISO
  shares: number
  strikePrice: number // ₪ per share
  vestingMonths: number // total cliff + linear, e.g. 48
  cliffMonths: number   // typically 12
  track: VestingTrack
}

export interface RsuGrant {
  grantId: string
  grantDate: string
  units: number
  vestingMonths: number
  cliffMonths: number
  track: VestingTrack
}

export interface VestingResult {
  vestedShares: number
  unvestedShares: number
  intrinsicValueNis: number
  capitalGainNis: number
  expectedTaxNis: number
  details: { grantId: string; vestedShares: number; perShareIntrinsic: number }[]
}

const CAPITAL_TRACK_TAX_RATE = 0.25
const INCOME_TRACK_TAX_RATE = 0.50 // top marginal bracket assumption
const MS_PER_DAY = 86400000
const DAYS_PER_MONTH = 30.44

export function calculateOptionsVesting(
  grants: OptionGrant[],
  currentPriceNis: number,
  asOfDate: string = new Date().toISOString()
): VestingResult {
  const asOf = new Date(asOfDate).getTime()
  const result: VestingResult = {
    vestedShares: 0, unvestedShares: 0,
    intrinsicValueNis: 0, capitalGainNis: 0, expectedTaxNis: 0, details: [],
  }

  for (const g of grants) {
    const start = new Date(g.grantDate).getTime()
    const monthsElapsed = Math.max(0, (asOf - start) / (MS_PER_DAY * DAYS_PER_MONTH))
    const vestedShares = computeVested(g.shares, monthsElapsed, g.cliffMonths, g.vestingMonths)
    const perShareIntrinsic = Math.max(0, currentPriceNis - g.strikePrice)
    const grantValue = vestedShares * perShareIntrinsic

    result.vestedShares += vestedShares
    result.unvestedShares += g.shares - vestedShares
    result.intrinsicValueNis += grantValue
    result.capitalGainNis += grantValue
    result.expectedTaxNis += grantValue * (g.track === 'capital' ? CAPITAL_TRACK_TAX_RATE : INCOME_TRACK_TAX_RATE)
    result.details.push({ grantId: g.grantId, vestedShares, perShareIntrinsic })
  }

  result.intrinsicValueNis = Math.round(result.intrinsicValueNis)
  result.capitalGainNis = Math.round(result.capitalGainNis)
  result.expectedTaxNis = Math.round(result.expectedTaxNis)
  return result
}

function computeVested(total: number, monthsElapsed: number, cliff: number, totalVest: number): number {
  if (monthsElapsed < cliff) return 0
  if (monthsElapsed >= totalVest) return total
  return Math.floor((monthsElapsed / totalVest) * total)
}

export function calculateRsuVesting(
  grants: RsuGrant[],
  currentPriceNis: number,
  asOfDate: string = new Date().toISOString()
): VestingResult {
  return calculateOptionsVesting(
    grants.map(g => ({ ...g, shares: g.units, strikePrice: 0 })),
    currentPriceNis,
    asOfDate
  )
}
