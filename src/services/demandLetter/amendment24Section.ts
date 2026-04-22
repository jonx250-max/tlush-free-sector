import type { AnalysisFinding } from '../../types'
import { LABOR_LAWS } from '../../data/laborLaws'

export function buildAmendment24Section(
  findings: AnalysisFinding[],
  monthName: string,
  year: number,
): string {
  if (!findings.some(f => f.category === 'amendment24')) return ''
  return `
    <h3 style="color: #DC2626; margin-top: 20px;">הפרה של תיקון 24 לחוק הגנת השכר</h3>
    <p>
      בתלוש השכר לחודש ${monthName} ${year} לא פורטו שעות נוספות גלובליות בנפרד מהשכר הבסיסי,
      בניגוד לדרישת ${LABOR_LAWS.wageProtection.amendment24}.
    </p>
    <p>
      ${LABOR_LAWS.wageProtection.section26}
    </p>
    `
}
