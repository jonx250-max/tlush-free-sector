// ============================================================
// Demand Letter Generator — מכתב דרישה
// Generates formal Hebrew demand letter from analysis findings
// ============================================================

import type { AnalysisFinding, DiffResult } from '../types'
import { LABOR_LAWS } from '../data/laborLaws'

export interface DemandLetterInput {
  employeeName: string
  employeeId: string
  employerName: string
  employerId: string
  result: DiffResult
  payslipMonth: number
  payslipYear: number
}

export interface DemandLetterOutput {
  html: string
  totalClaimedAmount: number
  responseDeadline: string
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function generateDemandLetter(input: DemandLetterInput): DemandLetterOutput {
  const underpaidFindings = input.result.findings.filter(
    f => f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip',
  )
  const totalClaimedAmount = underpaidFindings.reduce((sum, f) => sum + f.gap, 0)

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const responseDeadline = deadline.toLocaleDateString('he-IL')

  const today = new Date().toLocaleDateString('he-IL')
  const monthName = HEBREW_MONTHS[input.payslipMonth - 1]

  const findingsRows = underpaidFindings
    .map(f => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(f.fieldName)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${f.contractValue !== null ? f.contractValue.toLocaleString() + ' ₪' : '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${f.payslipValue !== null ? f.payslipValue.toLocaleString() + ' ₪' : '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #DC2626; font-weight: bold;">${f.gap.toLocaleString()} ₪</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${escapeHtml(f.legalReference ?? '')}</td>
      </tr>
    `)
    .join('')

  const amendment24Section = input.result.findings.some(f => f.category === 'amendment24')
    ? `
    <h3 style="color: #DC2626; margin-top: 20px;">הפרה של תיקון 24 לחוק הגנת השכר</h3>
    <p>
      בתלוש השכר לחודש ${monthName} ${input.payslipYear} לא פורטו שעות נוספות גלובליות בנפרד מהשכר הבסיסי,
      בניגוד לדרישת ${LABOR_LAWS.wageProtection.amendment24}.
    </p>
    <p>
      ${LABOR_LAWS.wageProtection.section26}
    </p>
    `
    : ''

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Assistant', 'Heebo', 'Segoe UI', sans-serif; direction: rtl; line-height: 1.8; color: #111827; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { text-align: center; color: #1D4ED8; border-bottom: 2px solid #1D4ED8; padding-bottom: 10px; }
    h2 { color: #1D4ED8; margin-top: 30px; }
    h3 { color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #F3F4F6; padding: 10px 8px; border: 1px solid #ddd; text-align: right; }
    .total { font-size: 20px; font-weight: bold; color: #DC2626; text-align: center; margin: 20px 0; padding: 15px; border: 2px solid #DC2626; border-radius: 8px; }
    .footer { margin-top: 40px; font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>מכתב דרישה</h1>

  <p style="text-align: left;">תאריך: ${today}</p>

  <p>
    <strong>לכבוד:</strong> ${escapeHtml(input.employerName)}
    ${input.employerId ? `(ח.פ. ${escapeHtml(input.employerId)})` : ''}
  </p>

  <p>
    <strong>הנדון:</strong> דרישה לתיקון תלוש שכר ותשלום הפרשים — חודש ${monthName} ${input.payslipYear}
  </p>

  <h2>א. רקע</h2>
  <p>
    אני, ${escapeHtml(input.employeeName)}${input.employeeId ? ` (ת.ז. ${escapeHtml(input.employeeId)})` : ''},
    עובד/ת בחברתכם. לאחר בדיקה מדוקדקת של תלוש השכר לחודש ${monthName} ${input.payslipYear}
    מול תנאי חוזה ההעסקה שלי, נמצאו הפערים הבאים:
  </p>

  <h2>ב. פירוט הפערים שנמצאו</h2>
  <table>
    <thead>
      <tr>
        <th>שדה</th>
        <th>לפי חוזה</th>
        <th>בתלוש</th>
        <th>הפרש</th>
        <th>בסיס חוקי</th>
      </tr>
    </thead>
    <tbody>
      ${findingsRows}
    </tbody>
  </table>

  <div class="total">
    סה"כ הפרשים לתשלום: ${totalClaimedAmount.toLocaleString()} ₪
  </div>

  ${amendment24Section}

  <h2>ג. דרישה</h2>
  <p>
    הנני דורש/ת כי תתקנו את תלוש השכר ותשלמו את ההפרשים המפורטים לעיל
    בתוך <strong>30 יום</strong> ממועד קבלת מכתב זה, קרי עד ליום <strong>${responseDeadline}</strong>.
  </p>
  <p>
    היה ולא יענו דרישותיי במועד הנ"ל, אשקול לפנות לבית הדין לעבודה.
  </p>

  <h2>ד. בסיס חוקי</h2>
  <ul>
    <li>${LABOR_LAWS.wageProtection.name} — ${LABOR_LAWS.wageProtection.section5}</li>
    <li>${LABOR_LAWS.hoursOfWork.name} — ${LABOR_LAWS.hoursOfWork.overtime}</li>
    <li>${LABOR_LAWS.pension.name} — ${LABOR_LAWS.pension.section}</li>
    <li>${LABOR_LAWS.minimumWage.name} — ${LABOR_LAWS.minimumWage.section2}</li>
  </ul>

  <p style="margin-top: 40px;">בכבוד רב,</p>
  <p><strong>${escapeHtml(input.employeeName)}</strong></p>

  <div class="footer">
    <p>מסמך זה הופק באמצעות מערכת בדיקת תלוש שכר — המגזר הפרטי</p>
    <p>המידע במסמך הוא להנחיה בלבד ואינו מהווה ייעוץ משפטי</p>
  </div>
</body>
</html>
  `.trim()

  return { html, totalClaimedAmount: Math.round(totalClaimedAmount * 100) / 100, responseDeadline }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
