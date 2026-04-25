import { describe, it, expect } from 'vitest'
import { detectSalaryDrift, type SalaryPoint } from './salaryDriftDetector'

function buildYears(yearMap: Record<number, number>): SalaryPoint[] {
  return Object.entries(yearMap).flatMap(([year, gross]) =>
    Array.from({ length: 12 }, (_, m) => ({ year: parseInt(year), month: m + 1, monthlyGross: gross }))
  )
}

describe('detectSalaryDrift', () => {
  it('no drift when fewer than 12 points', () => {
    const r = detectSalaryDrift([{ year: 2024, month: 1, monthlyGross: 10000 }])
    expect(r.hasDrift).toBe(false)
  })

  it('detects salary drop year over year', () => {
    const points = buildYears({ 2024: 12000, 2025: 11000 })
    const r = detectSalaryDrift(points)
    expect(r.hasDrift).toBe(true)
    expect(r.findings[0].type).toBe('dropped')
    expect(r.totalShortfallNis).toBe(12000)
  })

  it('detects frozen salary (< 2% YoY)', () => {
    const points = buildYears({ 2024: 10000, 2025: 10100 })
    const r = detectSalaryDrift(points)
    expect(r.findings.some(f => f.type === 'frozen')).toBe(true)
  })

  it('detects below-min-wage-growth over 5+ years', () => {
    const points = buildYears({ 2022: 10000, 2023: 10300, 2024: 10500, 2025: 10700, 2026: 10900 })
    const r = detectSalaryDrift(points)
    const longRange = r.findings.find(f => f.yearEnd - f.yearStart >= 4)
    expect(longRange?.type === 'below_minwage_growth' || longRange?.type === 'frozen').toBe(true)
  })

  it('no drift when salary grows healthily', () => {
    const points = buildYears({ 2024: 10000, 2025: 11000, 2026: 12000 })
    const r = detectSalaryDrift(points)
    expect(r.hasDrift).toBe(false)
  })
})
