import { describe, it, expect } from 'vitest'
import { validateSpecialLeaves, isElectionDay, type SpecialLeaveEvent } from './specialLeavesValidator'

describe('validateSpecialLeaves', () => {
  it('validates full bereavement (shiva = 7 days)', () => {
    const events: SpecialLeaveEvent[] = [
      { type: 'bereavement_immediate', eventDate: '2026-04-01', daysTaken: 7, paid: true },
    ]
    const r = validateSpecialLeaves(events)
    expect(r.validated).toHaveLength(1)
    expect(r.shortfalls).toHaveLength(0)
  })

  it('flags shortfall when shiva paid only 5 days', () => {
    const events: SpecialLeaveEvent[] = [
      { type: 'bereavement_immediate', eventDate: '2026-04-01', daysTaken: 5, paid: true },
    ]
    const r = validateSpecialLeaves(events)
    expect(r.shortfalls).toHaveLength(1)
    expect(r.shortfalls[0].missingDays).toBe(2)
  })

  it('flags unpaid leave even if days correct', () => {
    const events: SpecialLeaveEvent[] = [
      { type: 'election', eventDate: '2025-10-28', daysTaken: 1, paid: false },
    ]
    const r = validateSpecialLeaves(events)
    expect(r.unpaid).toHaveLength(1)
  })

  it('jury_duty has no fixed cap', () => {
    const events: SpecialLeaveEvent[] = [
      { type: 'jury_duty', eventDate: '2026-03-10', daysTaken: 10, paid: true },
    ]
    const r = validateSpecialLeaves(events)
    expect(r.shortfalls).toHaveLength(0)
  })
})

describe('isElectionDay', () => {
  it('recognizes known election dates', () => {
    expect(isElectionDay('2022-11-01')).toBe(true)
    expect(isElectionDay('2025-10-28')).toBe(true)
  })

  it('rejects non-election dates', () => {
    expect(isElectionDay('2024-01-15')).toBe(false)
  })
})
