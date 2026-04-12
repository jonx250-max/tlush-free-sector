import { describe, it, expect } from 'vitest'
import { parseContractText } from './contractParser'

const SAMPLE_CONTRACT = `
חוזה העסקה אישי
נערך ונחתם ביום 01/03/2026

בין: חברת בדיקה בע"מ (להלן "המעסיק")
לבין: ישראל ישראלי ת.ז. 123456789 (להלן "העובד")

1. תיאור התפקיד
העובד יועסק בתפקיד מפתח תוכנה.

2. שכר
שכר בסיס חודשי: 14,000 ₪ (ארבעה עשר אלף שקלים חדשים)
5 ימים בשבוע
42 שעות עבודה בשבוע

3. שעות נוספות
שעות נוספות ישולמו בהתאם לחוק.

4. הפרשות סוציאליות
פנסיה: עובד: 6% מעסיק: 6.5%
קרן השתלמות: עובד: 2.5% מעסיק: 7.5%
פיצויים: 8.33%

5. חופשה ומחלה
ימי חופשה: 14 ימים בשנה
ימי מחלה: 18 ימים בשנה

6. נסיעות
החזר נסיעות: 400 ₪ לחודש

7. הודעה מוקדמת
תקופת הודעה מוקדמת: 30 ימים

8. סודיות
העובד מתחייב לשמור על סודיות כל המידע.

9. אי תחרות
העובד מתחייב שלא להתחרות במעסיק למשך 12 חודשים.
`

describe('parseContractText', () => {
  it('extracts base salary', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.baseSalary.value).toBe(14_000)
    expect(result.baseSalary.confidence).toBeGreaterThan(0.8)
  })

  it('detects monthly pay model', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.payModel.value).toBe('monthly')
  })

  it('extracts work days per week', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.workDaysPerWeek.value).toBe(5)
  })

  it('extracts weekly hours', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.standardHoursPerWeek.value).toBe(42)
  })

  it('extracts pension employee rate', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.pensionEmployeePct.value).toBe(6)
  })

  it('extracts pension employer rate', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.pensionEmployerPct.value).toBe(6.5)
  })

  it('extracts keren hishtalmut rates', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.kerenHishtalmutEmployeePct.value).toBe(2.5)
    expect(result.kerenHishtalmutEmployerPct.value).toBe(7.5)
  })

  it('extracts severance rate', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.severanceEmployerPct.value).toBe(8.33)
  })

  it('extracts vacation days', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.vacationDaysPerYear.value).toBe(14)
  })

  it('extracts sick days', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.sickDaysPerYear.value).toBe(18)
  })

  it('extracts travel allowance', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.travelAllowance.value).toBe(400)
  })

  it('extracts notice period', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.noticePeriodDays.value).toBe(30)
  })

  it('extracts effective date', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.effectiveDate.value).toBe('2026-03-01')
  })

  it('detects special clauses', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.specialClauses).toContain('סודיות')
    expect(result.specialClauses).toContain('אי תחרות')
  })

  it('detects standard overtime model', () => {
    const result = parseContractText(SAMPLE_CONTRACT)
    expect(result.overtimeModel.value).toBe('standard')
  })

  it('detects global salary model', () => {
    const globalContract = `
חוזה העסקה
שכר גלובלי: 15,000 ₪ כולל גמול שעות נוספות
30 שעות נוספות גלובלי בחודש
תוספת גלובלית: 3,000 ₪
5 ימים בשבוע
פנסיה: עובד: 6% מעסיק: 6.5%
פיצויים: 8.33%
`
    const result = parseContractText(globalContract)
    expect(result.payModel.value).toBe('global')
    expect(result.overtimeModel.value).toBe('global')
    expect(result.globalOvertimeHours.value).toBe(30)
    expect(result.globalOvertimeAmount.value).toBe(3_000)
  })

  it('detects hourly pay model', () => {
    const hourlyContract = `
חוזה העסקה
שכר לפי שעה
תעריף שעתי: 55 ₪
6 ימים בשבוע
פנסיה: עובד: 6% מעסיק: 6.5%
פיצויים: 8.33%
`
    const result = parseContractText(hourlyContract)
    expect(result.payModel.value).toBe('hourly')
    expect(result.hourlyRate.value).toBe(55)
    expect(result.workDaysPerWeek.value).toBe(6)
  })

  it('detects commission structure', () => {
    const commContract = `
חוזה העסקה
שכר בסיס חודשי: 8,000 ₪
5 ימים בשבוע
עמלות: 5% מהמכירות
פנסיה: עובד: 6% מעסיק: 6.5%
פיצויים: 8.33%
`
    const result = parseContractText(commContract)
    expect(result.commissionStructure.value).not.toBeNull()
    expect(result.commissionStructure.value?.type).toBe('percentage')
    expect(result.commissionStructure.value?.rate).toBe(5)
  })

  it('flags low-confidence fields for verification', () => {
    const minimal = `
חוזה העסקה
שכר חודשי: 10,000 ₪
`
    const result = parseContractText(minimal)
    // Fields with defaults should need verification
    expect(result.workDaysPerWeek.needsVerification).toBe(true)
    expect(result.pensionEmployeePct.needsVerification).toBe(true)
  })
})
