import { LABOR_LAWS } from '../../data/laborLaws'
import { escapeHtml } from './escapeHtml'

export interface TemplateParts {
  employeeName: string
  employeeId: string
  employerName: string
  employerId: string
  monthName: string
  year: number
  today: string
  responseDeadline: string
  totalClaimedAmount: number
  findingsRows: string
  amendment24Section: string
}

const STYLES = `
    body { font-family: 'Assistant', 'Heebo', 'Segoe UI', sans-serif; direction: rtl; line-height: 1.8; color: #111827; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { text-align: center; color: #1D4ED8; border-bottom: 2px solid #1D4ED8; padding-bottom: 10px; }
    h2 { color: #1D4ED8; margin-top: 30px; }
    h3 { color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #F3F4F6; padding: 10px 8px; border: 1px solid #ddd; text-align: right; }
    .total { font-size: 20px; font-weight: bold; color: #DC2626; text-align: center; margin: 20px 0; padding: 15px; border: 2px solid #DC2626; border-radius: 8px; }
    .footer { margin-top: 40px; font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
`

export function renderTemplate(p: TemplateParts): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>${STYLES}</style>
</head>
<body>
  <h1>מכתב דרישה</h1>

  <p style="text-align: left;">תאריך: ${p.today}</p>

  <p>
    <strong>לכבוד:</strong> ${escapeHtml(p.employerName)}
    ${p.employerId ? `(ח.פ. ${escapeHtml(p.employerId)})` : ''}
  </p>

  <p>
    <strong>הנדון:</strong> דרישה לתיקון תלוש שכר ותשלום הפרשים — חודש ${p.monthName} ${p.year}
  </p>

  <h2>א. רקע</h2>
  <p>
    אני, ${escapeHtml(p.employeeName)}${p.employeeId ? ` (ת.ז. ${escapeHtml(p.employeeId)})` : ''},
    עובד/ת בחברתכם. לאחר בדיקה מדוקדקת של תלוש השכר לחודש ${p.monthName} ${p.year}
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
      ${p.findingsRows}
    </tbody>
  </table>

  <div class="total">
    סה"כ הפרשים לתשלום: ${p.totalClaimedAmount.toLocaleString()} ₪
  </div>

  ${p.amendment24Section}

  <h2>ג. דרישה</h2>
  <p>
    הנני דורש/ת כי תתקנו את תלוש השכר ותשלמו את ההפרשים המפורטים לעיל
    בתוך <strong>30 יום</strong> ממועד קבלת מכתב זה, קרי עד ליום <strong>${p.responseDeadline}</strong>.
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
  <p><strong>${escapeHtml(p.employeeName)}</strong></p>

  <div class="footer">
    <p>מסמך זה הופק באמצעות מערכת בדיקת תלוש שכר — המגזר הפרטי</p>
    <p>המידע במסמך הוא להנחיה בלבד ואינו מהווה ייעוץ משפטי</p>
  </div>
</body>
</html>
  `.trim()
}
