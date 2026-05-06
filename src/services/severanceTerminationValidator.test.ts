import { describe, it, expect } from 'vitest'
import { validateTermination } from './severanceTerminationValidator'

const now = new Date('2026-05-05T00:00:00Z')

describe('E11 — termination cross-check', () => {
  it('clean input → valid', () => {
    const r = validateTermination({
      hireDate: '2020-01-01',
      terminationDate: '2026-04-30',
      noticePeriodDays: 30,
      noticeGivenDate: '2026-03-30',
      lastPayslipPeriod: { year: 2026, month: 4 },
    }, now)
    expect(r.valid).toBe(true)
    expect(r.issues).toEqual([])
  })

  it('detects termination before hire', () => {
    const r = validateTermination({
      hireDate: '2026-01-01',
      terminationDate: '2025-12-01',
      noticePeriodDays: 30,
    }, now)
    expect(r.valid).toBe(false)
    expect(r.issues[0].code).toBe('TERMINATION_BEFORE_HIRE')
  })

  it('detects termination in the future', () => {
    const r = validateTermination({
      hireDate: '2020-01-01',
      terminationDate: '2027-01-01',
      noticePeriodDays: 30,
    }, now)
    expect(r.issues.some(i => i.code === 'TERMINATION_IN_FUTURE')).toBe(true)
  })

  it('detects notice too short', () => {
    const r = validateTermination({
      hireDate: '2020-01-01',
      terminationDate: '2026-04-30',
      noticePeriodDays: 30,
      noticeGivenDate: '2026-04-20', // only 10 days
    }, now)
    expect(r.issues.some(i => i.code === 'NOTICE_TOO_SHORT')).toBe(true)
  })

  it('detects payslip too old', () => {
    const r = validateTermination({
      hireDate: '2020-01-01',
      terminationDate: '2026-04-30',
      noticePeriodDays: 30,
      lastPayslipPeriod: { year: 2026, month: 1 }, // 3 months stale
    }, now)
    expect(r.issues.some(i => i.code === 'PAYSLIP_TOO_OLD')).toBe(true)
  })

  it('detects notice given after termination', () => {
    const r = validateTermination({
      hireDate: '2020-01-01',
      terminationDate: '2026-04-30',
      noticePeriodDays: 30,
      noticeGivenDate: '2026-05-01',
    }, now)
    expect(r.issues.some(i => i.code === 'NOTICE_AFTER_TERMINATION')).toBe(true)
  })
})
