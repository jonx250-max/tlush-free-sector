import { describe, it, expect } from 'vitest'
import { parsePayslipText } from './payslipParser'

const SAMPLE_PAYSLIP = `
תלוש שכר לחודש מרץ 2026
חברת בדיקה בע"מ
שם עובד: ישראל ישראלי

שכר יסוד    100    10,000 ₪
שעות נוספות 125%   110    1,500 ₪
שעות נוספות: 12 שעות נוספות
החזר נסיעות  150    400 ₪
בונוס        130    2,000 ₪
דמי הבראה    140    440 ₪

סה"כ ברוטו: 14,340 ₪

מס הכנסה     200    1,200 ₪
ביטוח לאומי   210    450 ₪
מס בריאות     220    320 ₪
פנסיה עובד    230    600 ₪
קרן השתלמות עובד  240  250 ₪

פנסיה מעסיק   300    650 ₪
פיצויים מעסיק  310   833 ₪
קרן השתלמות מעסיק 320  750 ₪

סה"כ נטו: 11,520 ₪
`

describe('parsePayslipText', () => {
  it('extracts month and year', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.month).toBe(3)
    expect(result.year).toBe(2026)
  })

  it('extracts base pay', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.basePay).toBe(10_000)
  })

  it('extracts overtime pay', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.overtimePay).toBe(1_500)
  })

  it('extracts overtime hours', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.overtimeHours).toBe(12)
  })

  it('extracts travel allowance', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.travelAllowance).toBe(400)
  })

  it('extracts bonus pay', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.bonusPay).toBe(2_000)
  })

  it('extracts gross salary', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.grossSalary).toBe(14_340)
  })

  it('extracts net salary', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.netSalary).toBe(11_520)
  })

  it('extracts income tax', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.incomeTax).toBe(1_200)
  })

  it('extracts national insurance', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.nationalInsurance).toBe(450)
  })

  it('extracts health insurance', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.healthInsurance).toBe(320)
  })

  it('extracts pension employee', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.pensionEmployee).toBe(600)
  })

  it('extracts pension employer', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.pensionEmployer).toBe(650)
  })

  it('extracts keren hishtalmut employee', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.kerenHishtalmutEmployee).toBe(250)
  })

  it('extracts keren hishtalmut employer', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.kerenHishtalmutEmployer).toBe(750)
  })

  it('extracts severance employer', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.severanceEmployer).toBe(833)
  })

  it('builds entries array', () => {
    const result = parsePayslipText(SAMPLE_PAYSLIP)
    expect(result.entries.length).toBeGreaterThan(5)
  })

  it('extracts month from MM/YYYY format', () => {
    const text = 'תלוש שכר 06/2025\nשכר יסוד 8000 ₪\nברוטו: 8000 ₪'
    const result = parsePayslipText(text)
    expect(result.month).toBe(6)
    expect(result.year).toBe(2025)
  })

  it('detects global overtime line', () => {
    const text = `
תלוש שכר ינואר 2026
שכר יסוד 12,000 ₪
תוספת גלובלית 3,000 ₪
ברוטו: 15,000 ₪
נטו: 12,000 ₪
`
    const result = parsePayslipText(text)
    expect(result.globalOvertimeLine).toBe(3_000)
  })

  it('detects commission pay', () => {
    const text = `
תלוש שכר פברואר 2026
שכר יסוד 8,000 ₪
עמלות 4,500 ₪
ברוטו: 12,500 ₪
נטו: 10,000 ₪
`
    const result = parsePayslipText(text)
    expect(result.commissionPay).toBe(4_500)
  })
})
