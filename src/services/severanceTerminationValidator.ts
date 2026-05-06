/**
 * Stage E11 — pre-flight cross-check on severance termination inputs.
 *
 * Validates the user-provided termination date against the contract's
 * notice clause + the latest payslip period. Surfaces inconsistencies
 * BEFORE severanceCalculator runs so the user can correct rather than
 * receive a wrong number.
 */

export interface TerminationCrossCheckInput {
  hireDate: string                    // ISO yyyy-mm-dd
  terminationDate: string             // ISO yyyy-mm-dd
  noticePeriodDays: number            // from contract
  noticeGivenDate?: string | null     // ISO; optional
  lastPayslipPeriod?: { year: number; month: number } | null
}

export interface TerminationIssue {
  code:
    | 'TERMINATION_BEFORE_HIRE'
    | 'TERMINATION_IN_FUTURE'
    | 'NOTICE_TOO_SHORT'
    | 'PAYSLIP_TOO_OLD'
    | 'NOTICE_AFTER_TERMINATION'
  message: string
}

export interface TerminationCrossCheckResult {
  valid: boolean
  issues: TerminationIssue[]
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function validateTermination(
  input: TerminationCrossCheckInput,
  now: Date = new Date(),
): TerminationCrossCheckResult {
  const issues: TerminationIssue[] = []

  if (input.terminationDate < input.hireDate) {
    issues.push({
      code: 'TERMINATION_BEFORE_HIRE',
      message: 'מועד סיום ההעסקה מוקדם ממועד תחילת ההעסקה.',
    })
  }

  const today = now.toISOString().slice(0, 10)
  if (input.terminationDate > today) {
    issues.push({
      code: 'TERMINATION_IN_FUTURE',
      message: 'מועד סיום ההעסקה הוזן בעתיד — אין שכר לחישוב פיצויים בתקופה זו.',
    })
  }

  if (input.noticeGivenDate) {
    if (input.noticeGivenDate > input.terminationDate) {
      issues.push({
        code: 'NOTICE_AFTER_TERMINATION',
        message: 'מועד מתן ההודעה המוקדמת מאוחר ממועד סיום ההעסקה.',
      })
    } else {
      const noticeDays = daysBetween(input.noticeGivenDate, input.terminationDate)
      if (noticeDays < input.noticePeriodDays) {
        issues.push({
          code: 'NOTICE_TOO_SHORT',
          message: `הודעה מוקדמת ${noticeDays} ימים, כאשר החוזה דורש ${input.noticePeriodDays}. פיצויים עשויים להידרש לכלול תוספת בגין ההפרה.`,
        })
      }
    }
  }

  if (input.lastPayslipPeriod) {
    const ttDate = new Date(input.terminationDate)
    const ttYearMonth = ttDate.getFullYear() * 12 + ttDate.getMonth() + 1
    const lpYearMonth = input.lastPayslipPeriod.year * 12 + input.lastPayslipPeriod.month
    const monthsBehind = ttYearMonth - lpYearMonth
    if (monthsBehind > 2) {
      issues.push({
        code: 'PAYSLIP_TOO_OLD',
        message: `התלוש האחרון מתאים לחודש ${input.lastPayslipPeriod.month}/${input.lastPayslipPeriod.year} — ${monthsBehind} חודשים לפני מועד הסיום. בסיס החישוב לפיצויים עלול להיות שגוי.`,
      })
    }
  }

  return { valid: issues.length === 0, issues }
}
