import { describe, it, expect } from 'vitest'
import { validateWorkplaceChanges, type EmploymentSegment } from './workplaceChangeValidator'

describe('validateWorkplaceChanges', () => {
  it('handles empty segments', () => {
    const r = validateWorkplaceChanges([])
    expect(r.totalSeniorityDays).toBe(0)
    expect(r.isValid).toBe(true)
  })

  it('continuous single employer counted correctly', () => {
    const seg: EmploymentSegment[] = [
      { employerId: 'a', employerName: 'A', startDate: '2024-01-01', endDate: '2024-12-31' },
    ]
    const r = validateWorkplaceChanges(seg)
    expect(r.totalSeniorityDays).toBe(365)
    expect(r.hasContinuity).toBe(true)
  })

  it('preserves continuity across short gap (< 90 days)', () => {
    const seg: EmploymentSegment[] = [
      { employerId: 'a', employerName: 'A', startDate: '2024-01-01', endDate: '2024-06-30' },
      { employerId: 'b', employerName: 'B', startDate: '2024-08-01', endDate: '2024-12-31' },
    ]
    const r = validateWorkplaceChanges(seg)
    expect(r.hasContinuity).toBe(true)
  })

  it('breaks continuity on long gap with different employer', () => {
    const seg: EmploymentSegment[] = [
      { employerId: 'a', employerName: 'A', startDate: '2023-01-01', endDate: '2023-06-30' },
      { employerId: 'b', employerName: 'B', startDate: '2024-01-01', endDate: '2024-12-31' },
    ]
    const r = validateWorkplaceChanges(seg)
    expect(r.hasContinuity).toBe(false)
    expect(r.brokenSegments).toHaveLength(1)
  })

  it('contracted seniority validated within 30-day tolerance', () => {
    const seg: EmploymentSegment[] = [
      { employerId: 'a', employerName: 'A', startDate: '2024-01-01', endDate: '2024-12-31' },
    ]
    const r = validateWorkplaceChanges(seg, 360)
    expect(r.isValid).toBe(true)
  })

  it('flags mismatch when contracted vs actual differ > 30 days', () => {
    const seg: EmploymentSegment[] = [
      { employerId: 'a', employerName: 'A', startDate: '2024-01-01', endDate: '2024-12-31' },
    ]
    const r = validateWorkplaceChanges(seg, 200)
    expect(r.isValid).toBe(false)
  })
})
