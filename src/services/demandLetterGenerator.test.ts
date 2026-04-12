import { describe, it, expect } from 'vitest'
import { generateDemandLetter } from './demandLetterGenerator'
import type { DiffResult, AnalysisFinding } from '../types'

function makeDiffResult(findings: AnalysisFinding[]): DiffResult {
  return {
    findings,
    summary: {
      totalFindings: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      warning: findings.filter(f => f.severity === 'warning').length,
      info: findings.filter(f => f.severity === 'info').length,
      totalGapAmount: findings.reduce((s, f) => s + f.gap, 0),
    },
    overtimeAnalysis: { model: 'standard', expectedPay: 0, actualPay: 0, gap: 0, effectiveHourlyRate: 55 },
    taxAnalysis: { expectedTax: 800, actualTax: 800, overcharge: 0, creditPoints: 2.25, creditPointsValue: 544, regionalBenefitValue: 0 },
  }
}

describe('generateDemandLetter', () => {
  it('generates HTML with employer name', () => {
    const result = generateDemandLetter({
      employeeName: 'ישראל ישראלי',
      employeeId: '123456789',
      employerName: 'חברת בדיקה בע"מ',
      employerId: '51-1234567',
      result: makeDiffResult([{
        category: 'base_pay',
        fieldName: 'שכר בסיס',
        contractValue: 14000,
        payslipValue: 12000,
        gap: 2000,
        gapDirection: 'underpaid',
        severity: 'critical',
        legalReference: 'חוק הגנת השכר',
        explanation: 'שכר בסיס בחסר',
      }]),
      payslipMonth: 3,
      payslipYear: 2026,
    })

    expect(result.html).toContain('חברת בדיקה בע&quot;מ')
    expect(result.html).toContain('ישראל ישראלי')
    expect(result.html).toContain('מרץ 2026')
    expect(result.totalClaimedAmount).toBe(2000)
  })

  it('lists all underpaid findings', () => {
    const result = generateDemandLetter({
      employeeName: 'עובד',
      employeeId: '',
      employerName: 'מעסיק',
      employerId: '',
      result: makeDiffResult([
        { category: 'base_pay', fieldName: 'שכר בסיס', contractValue: 14000, payslipValue: 12000, gap: 2000, gapDirection: 'underpaid', severity: 'critical', legalReference: null, explanation: '' },
        { category: 'travel', fieldName: 'נסיעות', contractValue: 500, payslipValue: 0, gap: 500, gapDirection: 'missing_from_payslip', severity: 'info', legalReference: null, explanation: '' },
      ]),
      payslipMonth: 1,
      payslipYear: 2026,
    })

    expect(result.totalClaimedAmount).toBe(2500)
    expect(result.html).toContain('שכר בסיס')
    expect(result.html).toContain('נסיעות')
  })

  it('includes Amendment 24 section when relevant', () => {
    const result = generateDemandLetter({
      employeeName: 'עובד',
      employeeId: '',
      employerName: 'מעסיק',
      employerId: '',
      result: makeDiffResult([
        { category: 'amendment24', fieldName: 'תיקון 24', contractValue: null, payslipValue: null, gap: 0, gapDirection: 'missing_from_payslip', severity: 'critical', legalReference: 'תיקון 24', explanation: 'לא מפורט' },
      ]),
      payslipMonth: 6,
      payslipYear: 2026,
    })

    expect(result.html).toContain('תיקון 24 לחוק הגנת השכר')
  })

  it('sets 30-day deadline', () => {
    const result = generateDemandLetter({
      employeeName: 'עובד',
      employeeId: '',
      employerName: 'מעסיק',
      employerId: '',
      result: makeDiffResult([]),
      payslipMonth: 1,
      payslipYear: 2026,
    })

    expect(result.responseDeadline).toBeDefined()
    expect(result.html).toContain('30 יום')
  })

  it('escapes HTML in names', () => {
    const result = generateDemandLetter({
      employeeName: '<script>alert("xss")</script>',
      employeeId: '',
      employerName: 'Test & Co',
      employerId: '',
      result: makeDiffResult([]),
      payslipMonth: 1,
      payslipYear: 2026,
    })

    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html).toContain('Test &amp; Co')
  })
})
