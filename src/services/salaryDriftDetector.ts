// Detects salary stagnation/drift across multiple periods.
// Israeli labor law: no automatic raise, but stagnation while
// minimum wage rises = effective demotion. Used for legal claim.

export interface SalaryPoint {
  year: number
  month: number
  monthlyGross: number
}

export interface DriftFinding {
  type: 'frozen' | 'dropped' | 'below_minwage_growth'
  yearStart: number
  yearEnd: number
  changePct: number
  amountDelta: number
  note: string
}

export interface DriftResult {
  hasDrift: boolean
  findings: DriftFinding[]
  totalShortfallNis: number
}

const FROZEN_THRESHOLD_PCT = 0.02 // <2% YoY = frozen
const MIN_WAGE_GROWTH_PCT_2022_2026 = 0.165 // ~16.5% cumulative

export function detectSalaryDrift(points: SalaryPoint[]): DriftResult {
  if (points.length < 12) {
    return { hasDrift: false, findings: [], totalShortfallNis: 0 }
  }

  const yearAverages = computeYearAverages(points)
  const findings: DriftFinding[] = []
  let totalShortfall = 0

  const years = Array.from(yearAverages.keys()).sort()
  for (let i = 1; i < years.length; i++) {
    const prev = yearAverages.get(years[i - 1])!
    const curr = yearAverages.get(years[i])!
    const changePct = (curr - prev) / prev
    const finding = classifyChange(years[i - 1], years[i], prev, curr, changePct)
    if (finding) {
      findings.push(finding)
      totalShortfall += Math.max(0, -finding.amountDelta)
    }
  }

  // Long-range aggregate check (5+ years): cumulative growth vs minwage
  if (years.length >= 5) {
    const firstYear = years[0]
    const lastYear = years[years.length - 1]
    const first = yearAverages.get(firstYear)!
    const last = yearAverages.get(lastYear)!
    const totalChangePct = (last - first) / first
    if (lastYear - firstYear >= 4 && totalChangePct < MIN_WAGE_GROWTH_PCT_2022_2026) {
      findings.push({
        type: 'below_minwage_growth',
        yearStart: firstYear,
        yearEnd: lastYear,
        changePct: totalChangePct,
        amountDelta: (last - first) * 12,
        note: `עליית שכר מצטברת ${(totalChangePct * 100).toFixed(1)}% נמוכה מעליית שכר המינימום בתקופה`,
      })
    }
  }

  return { hasDrift: findings.length > 0, findings, totalShortfallNis: Math.round(totalShortfall) }
}

function computeYearAverages(points: SalaryPoint[]): Map<number, number> {
  const sums = new Map<number, { total: number; count: number }>()
  for (const p of points) {
    const cur = sums.get(p.year) ?? { total: 0, count: 0 }
    sums.set(p.year, { total: cur.total + p.monthlyGross, count: cur.count + 1 })
  }
  const avgs = new Map<number, number>()
  for (const [year, { total, count }] of sums) avgs.set(year, total / count)
  return avgs
}

function classifyChange(yearA: number, yearB: number, prev: number, curr: number, changePct: number): DriftFinding | null {
  const amountDelta = (curr - prev) * 12
  if (curr < prev) {
    return {
      type: 'dropped', yearStart: yearA, yearEnd: yearB, changePct, amountDelta,
      note: `ירידה בשכר השנתי ב-${(changePct * 100).toFixed(1)}%`,
    }
  }
  if (changePct < FROZEN_THRESHOLD_PCT) {
    return {
      type: 'frozen', yearStart: yearA, yearEnd: yearB, changePct, amountDelta,
      note: `שכר קפוא או כמעט קפוא (${(changePct * 100).toFixed(1)}% YoY)`,
    }
  }
  if (yearB - yearA >= 4 && changePct < MIN_WAGE_GROWTH_PCT_2022_2026) {
    return {
      type: 'below_minwage_growth', yearStart: yearA, yearEnd: yearB, changePct, amountDelta,
      note: `עליית השכר נמוכה מעליית שכר המינימום בתקופה`,
    }
  }
  return null
}
