import { describe, it, expect } from 'vitest'
import { detectIllegalDeductions } from './illegalDeductionsDetector'
import type { PayslipEntry } from '../types'

const e = (name: string, amount: number, section: PayslipEntry['section'] = 'deductions'): PayslipEntry => ({
  code: '01', name, amount, section,
})

describe('detectIllegalDeductions', () => {
  it('passes legitimate deductions', () => {
    const r = detectIllegalDeductions([
      e('מס הכנסה', 1000), e('ביטוח לאומי', 500), e('פנסיה עובד', 600),
    ])
    expect(r.suspiciousDeductions).toHaveLength(0)
    expect(r.totalSuspicious).toBe(0)
  })

  it('flags fines / fees', () => {
    const r = detectIllegalDeductions([
      e('קנס איחור', 100), e('חניה', 200),
    ])
    expect(r.suspiciousDeductions).toHaveLength(2)
    expect(r.totalSuspicious).toBe(300)
  })

  it('flags unknown deductions as needing written consent', () => {
    const r = detectIllegalDeductions([e('ניכוי מיוחד', 50)])
    expect(r.suspiciousDeductions).toHaveLength(1)
    expect(r.suspiciousDeductions[0].reason).toContain('הסכמה בכתב')
  })

  it('ignores earnings section', () => {
    const r = detectIllegalDeductions([e('שכר בסיס', 10000, 'earnings')])
    expect(r.suspiciousDeductions).toHaveLength(0)
  })
})
