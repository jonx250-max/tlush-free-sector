export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function round0(n: number): number {
  return Math.round(n)
}

export function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo
  if (n > hi) return hi
  return n
}

export function percent(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return round2((numerator / denominator) * 100)
}

export function zero(): number {
  return 0
}

const ILS_FORMATTER = new Intl.NumberFormat('he-IL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Format an integer ILS amount with Hebrew locale separators (e.g.
 * 12500 → "12,500"). Single shared Intl instance — significantly cheaper
 * than calling `n.toLocaleString('he-IL')` per call site.
 */
export function formatIls(n: number): string {
  return ILS_FORMATTER.format(round0(n))
}
