import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  AlertTriangle, CheckCircle, FileText, Download, ArrowLeft,
  MessageCircle, Copy, ChevronDown,
} from 'lucide-react'
import type { DiffResult, AnalysisFinding, Severity, FindingCategory } from '../types'
import { he } from '../i18n/he'
import { useAnalysisStore } from '../hooks/useAnalysis'
import { generateDemandLetter } from '../services/demandLetterGenerator'
import { SanitizedLetter } from '../components/SanitizedHtml'

// Sanitize the demand letter HTML before render. Belt-and-braces:
// `demandLetterGenerator` already escapes user fields via `escapeHtml`,
// but DOMPurify catches any future regression from there.
const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'span', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
  ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel', 'colspan', 'rowspan', 'dir'],
  ALLOW_DATA_ATTR: false,
}

const CATEGORY_GROUPS: { label: string; categories: FindingCategory[] }[] = [
  { label: 'שעות נוספות', categories: ['overtime', 'global_overtime', 'shift_differential'] },
  { label: 'הפרשות סוציאליות', categories: ['pension_employee', 'pension_employer', 'keren_hishtalmut', 'severance', 'severance_form_161'] },
  { label: 'החזרים והטבות', categories: ['travel', 'commute_reimbursement', 'meals', 'phone', 'recuperation', 'holiday_pay', 'holiday_gift'] },
  { label: 'סיום העסקה', categories: ['advance_notice', 'vacation', 'vacation_balance', 'sick_days'] },
  { label: 'שכר ובונוסים', categories: ['base_pay', 'minimum_wage', 'commission', 'bonus', 'thirteenth_salary', 'seniority_bonus', 'military_reserve_pay'] },
  { label: 'מס וניכויים', categories: ['income_tax', 'national_insurance', 'health_insurance', 'illegal_deduction', 'wage_debt'] },
  { label: 'תאימות חוקית', categories: ['amendment24', 'collective_agreement', 'other'] },
]

const currency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

export function ResultsPage() {
  const store = useAnalysisStore()
  const navigate = useNavigate()
  const [letterHtml, setLetterHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // copyError + letterError surface async failures the user otherwise
  // would not notice (silent clipboard rejection on Safari with no
  // permission, generator throwing on malformed result, etc.).
  const [copyError, setCopyError] = useState<string | null>(null)
  const [letterError, setLetterError] = useState<string | null>(null)

  const result = store.result

  const summaryText = useMemo(() => result ? buildSummaryText(result) : '', [result])
  const sanitizedLetterHtml = useMemo(
    () => letterHtml ? DOMPurify.sanitize(letterHtml, SANITIZE_CONFIG) : '',
    [letterHtml]
  )

  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-cs-muted">אין תוצאות להצגה.</p>
        <Button className="mt-4" onClick={() => navigate('/upload')}>
          <ArrowLeft size={16} /> העלה חוזה ותלוש
        </Button>
      </div>
    )
  }

  const handleWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Permission denied (sandboxed iframe / Safari without focus / HTTP
      // origin) or quota exceeded. Surfacing the failure prevents the
      // user from sending a partial demand letter believing they had
      // a copy of the summary in their clipboard.
      setCopyError('ההעתקה נכשלה — נסה לסמן ולהעתיק ידנית')
      setTimeout(() => setCopyError(null), 4000)
    }
  }

  const handleGenerateLetter = () => {
    setLetterError(null)
    if (!store.payslip) return
    try {
      const output = generateDemandLetter({
        employeeName: 'עובד/ת',
        employeeId: '',
        employerName: 'מעסיק',
        employerId: '',
        result,
        payslipMonth: store.payslip.month,
        payslipYear: store.payslip.year,
      })
      setLetterHtml(output.html)
    } catch (err) {
      console.error('[results] generateDemandLetter failed', err)
      setLetterError('נכשלה הפקת מכתב הדרישה — נסה שוב, ואם הבעיה ממשיכה צור איתנו קשר')
    }
  }

  const handlePrintLetter = () => {
    if (!letterHtml) return
    // Render via Blob URL + iframe instead of doc-write. Blob is sandboxed
    // through the same-origin rules; iframe.print() triggers the print dialog.
    const sanitized = DOMPurify.sanitize(letterHtml, SANITIZE_CONFIG)
    const fullDoc = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>מכתב דרישה</title></head><body>${sanitized}</body></html>`
    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;'
    iframe.src = blobUrl
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl)
          iframe.remove()
        }, 60_000)
      }
    }
    document.body.appendChild(iframe)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-28 sm:pb-8">
      <h1 className="font-heading text-2xl font-bold text-cs-text">{he.results.title}</h1>

      {/* Amendment-24 alert moved ABOVE the summary so screen readers and
          sighted users see the critical legal-violation card first. On
          mobile it stays in viewport while the user scrolls findings. */}
      <Amendment24Alert findings={result.findings} />

      {/* Summary is wrapped in an aria-live region so SR users hear the
          totals when the page loads or when async results arrive. */}
      <section role="status" aria-live="polite" aria-atomic="true">
        <ResultsSummary result={result} />
      </section>

      <CategoryGroupedFindings findings={result.findings} />
      <TaxSummary result={result} />
      <OvertimeSummary result={result} />

      {letterError && (
        <p role="alert" className="text-sm font-medium text-cs-danger">
          {letterError}
        </p>
      )}
      {copyError && (
        <p role="alert" className="text-sm font-medium text-cs-danger">
          {copyError}
        </p>
      )}

      {/* Desktop actions */}
      <div className="hidden flex-wrap gap-3 sm:flex">
        <Button variant="primary" onClick={handleGenerateLetter}>
          <FileText size={16} />
          {he.results.generateLetter}
        </Button>
        <Button variant="outline" onClick={handleWhatsapp}>
          <MessageCircle size={16} />
          {he.results.shareWhatsapp}
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          <Copy size={16} />
          {copied ? 'הועתק ✓' : he.results.copyText}
        </Button>
        <Button variant="outline" onClick={() => navigate('/upload')}>
          <ArrowLeft size={16} />
          ניתוח חדש
        </Button>
      </div>

      {/* Mobile sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cs-border bg-white/95 px-3 py-3 backdrop-blur sm:hidden">
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 text-sm" onClick={handleGenerateLetter}>
            <FileText size={14} /> מכתב
          </Button>
          <Button variant="outline" className="flex-1 text-sm" onClick={handleWhatsapp}>
            <MessageCircle size={14} /> וואטסאפ
          </Button>
          <Button variant="outline" className="flex-1 text-sm" onClick={handleCopy}>
            <Copy size={14} /> {copied ? '✓' : 'העתק'}
          </Button>
        </div>
      </div>

      {letterHtml && (
        <Card>
          <CardTitle>מכתב דרישה</CardTitle>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={handlePrintLetter}>
              <Download size={16} /> הדפסה / שמירה כ-PDF
            </Button>
          </div>
          <SanitizedLetter html={sanitizedLetterHtml} />
        </Card>
      )}
    </div>
  )
}

function ResultsSummary({ result }: { result: DiffResult }) {
  const { summary } = result

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card className="text-center">
        <p className="text-3xl font-bold text-cs-text">{summary.totalFindings}</p>
        <p className="text-sm text-cs-muted">ממצאים</p>
      </Card>
      <Card className="text-center">
        <p className="text-3xl font-bold text-cs-danger">{summary.critical}</p>
        <p className="text-sm text-cs-muted">קריטיים</p>
      </Card>
      <Card className="text-center">
        <p className="text-3xl font-bold text-cs-warning">{summary.warning}</p>
        <p className="text-sm text-cs-muted">אזהרות</p>
      </Card>
      <Card className="text-center">
        <p className="text-3xl font-bold text-cs-primary">
          {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(summary.totalGapAmount)}
        </p>
        <p className="text-sm text-cs-muted">סה"כ פערים</p>
      </Card>
    </div>
  )
}

function Amendment24Alert({ findings }: { findings: AnalysisFinding[] }) {
  const a24 = findings.find(f => f.category === 'amendment24')
  if (!a24) return null

  // role="alert" → SR announces immediately on render. On mobile the card
  // becomes sticky-top so this critical legal warning stays visible while
  // the user scrolls through the rest of the findings.
  return (
    <Card
      role="alert"
      className="border-cs-danger/30 bg-cs-danger/5 sm:static sticky top-16 z-30 shadow-md sm:shadow-none"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={24} className="mt-0.5 shrink-0 text-cs-danger" />
        <div>
          <h3 className="font-heading text-lg font-bold text-cs-danger">
            {he.alerts.amendment24Title}
          </h3>
          <p className="mt-1 text-sm text-cs-text">{a24.explanation}</p>
          <p className="mt-2 text-xs text-cs-muted">{a24.legalReference}</p>
        </div>
      </div>
    </Card>
  )
}

function CategoryGroupedFindings({ findings }: { findings: AnalysisFinding[] }) {
  if (findings.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-cs-success">
          <CheckCircle size={24} />
          <p className="font-medium">לא נמצאו פערים — התלוש תואם את החוזה</p>
        </div>
      </Card>
    )
  }

  const groups = CATEGORY_GROUPS
    .map(g => ({ ...g, items: findings.filter(f => g.categories.includes(f.category)) }))
    .filter(g => g.items.length > 0)

  const uncategorized = findings.filter(
    f => !CATEGORY_GROUPS.some(g => g.categories.includes(f.category)),
  )

  return (
    <Card>
      <CardTitle>ממצאים מפורטים</CardTitle>
      <div className="mt-4 space-y-3">
        {groups.map(g => <CategorySection key={g.label} label={g.label} items={g.items} />)}
        {uncategorized.length > 0 && (
          <CategorySection label="אחר" items={uncategorized} />
        )}
      </div>
    </Card>
  )
}

function CategorySection({ label, items }: { label: string; items: AnalysisFinding[] }) {
  const [open, setOpen] = useState(true)
  const critical = items.filter(i => i.severity === 'critical').length
  const warning = items.filter(i => i.severity === 'warning').length
  const totalGap = items
    .filter(i => i.gapDirection === 'underpaid' || i.gapDirection === 'missing_from_payslip')
    .reduce((s, i) => s + i.gap, 0)

  const sorted = [...items].sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="rounded-lg border border-cs-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right hover:bg-cs-bg/50"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={18}
            className={`text-cs-muted transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="font-medium text-cs-text">{label}</span>
          <span className="text-xs text-cs-muted">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {critical > 0 && <Badge variant="critical">{critical} קריטי</Badge>}
          {warning > 0 && <Badge variant="warning">{warning} אזהרה</Badge>}
          {totalGap > 0 && (
            <span className="text-sm font-bold text-cs-danger">{currency(totalGap)}</span>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-cs-border/50">
          {sorted.map((f, i) => <FindingRow key={i} finding={f} />)}
        </div>
      )}
    </div>
  )
}

function FindingRow({ finding: f }: { finding: AnalysisFinding }) {
  const gapColor =
    f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip'
      ? 'text-cs-danger'
      : f.gapDirection === 'overpaid'
      ? 'text-cs-warning'
      : 'text-cs-success'

  return (
    <div className="flex flex-col gap-2 border-b border-cs-border/50 px-4 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={f.severity} />
          <p className="font-medium text-cs-text">{f.fieldName}</p>
        </div>
        <p className="mt-1 text-sm text-cs-muted">{f.explanation}</p>
        {f.legalReference && (
          <p className="mt-1 text-xs text-cs-primary">{f.legalReference}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm sm:flex-col sm:items-end sm:gap-0">
        <div className="text-cs-muted">
          <span className="text-xs">חוזה:</span>{' '}
          {f.contractValue !== null ? `${f.contractValue.toLocaleString()} ₪` : '—'}
        </div>
        <div className="text-cs-muted">
          <span className="text-xs">תלוש:</span>{' '}
          {f.payslipValue !== null ? `${f.payslipValue.toLocaleString()} ₪` : '—'}
        </div>
        <div className={`font-bold ${gapColor}`}>
          {f.gap > 0 ? `${f.gap.toLocaleString()} ₪` : '—'}
        </div>
      </div>
    </div>
  )
}

function buildSummaryText(result: DiffResult): string {
  const { summary, findings } = result
  const lines: string[] = []
  lines.push('תוצאות בדיקת תלוש — TLUSH')
  lines.push('')
  lines.push(`ממצאים: ${summary.totalFindings} (${summary.critical} קריטי, ${summary.warning} אזהרה)`)
  lines.push(`סה"כ פער: ${currency(summary.totalGapAmount)}`)
  lines.push('')
  const top = [...findings].sort((a, b) => b.gap - a.gap).slice(0, 5)
  if (top.length > 0) {
    lines.push('פערים עיקריים:')
    top.forEach(f => lines.push(`• ${f.fieldName}: ${f.gap.toLocaleString()} ₪`))
  }
  lines.push('')
  lines.push('— נוצר ע"י tlush-free-sector.vercel.app')
  return lines.join('\n')
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, { variant: 'critical' | 'warning' | 'info'; label: string }> = {
    critical: { variant: 'critical', label: 'קריטי' },
    warning: { variant: 'warning', label: 'אזהרה' },
    info: { variant: 'info', label: 'מידע' },
  }
  const { variant, label } = map[severity]
  return <Badge variant={variant}>{label}</Badge>
}

function TaxSummary({ result }: { result: DiffResult }) {
  const { taxAnalysis } = result
  return (
    <Card>
      <CardTitle>ניתוח מס הכנסה</CardTitle>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-cs-muted">מס צפוי</p>
          <p className="text-lg font-bold text-cs-text">{taxAnalysis.expectedTax.toLocaleString()} ₪</p>
        </div>
        <div>
          <p className="text-cs-muted">מס בפועל</p>
          <p className="text-lg font-bold text-cs-text">{taxAnalysis.actualTax.toLocaleString()} ₪</p>
        </div>
        <div>
          <p className="text-cs-muted">נקודות זיכוי</p>
          <p className="text-lg font-bold text-cs-text">{taxAnalysis.creditPoints} ({taxAnalysis.creditPointsValue.toLocaleString()} ₪)</p>
        </div>
      </div>
      {taxAnalysis.overcharge > 0 && (
        <p className="mt-3 text-sm font-medium text-cs-danger">
          נוכה מס ביתר: {taxAnalysis.overcharge.toLocaleString()} ₪
        </p>
      )}
    </Card>
  )
}

function OvertimeSummary({ result }: { result: DiffResult }) {
  const { overtimeAnalysis } = result
  return (
    <Card>
      <CardTitle>ניתוח שעות נוספות</CardTitle>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-cs-muted">מודל</p>
          <p className="font-bold text-cs-text">
            {overtimeAnalysis.model === 'global' ? 'גלובלי' : overtimeAnalysis.model === 'standard' ? 'רגיל' : 'ללא'}
          </p>
        </div>
        <div>
          <p className="text-cs-muted">תעריף שעתי אפקטיבי</p>
          <p className="font-bold text-cs-text">{overtimeAnalysis.effectiveHourlyRate.toLocaleString()} ₪</p>
        </div>
        <div>
          <p className="text-cs-muted">פער שעות נוספות</p>
          <p className={`font-bold ${overtimeAnalysis.gap > 0 ? 'text-cs-danger' : 'text-cs-success'}`}>
            {overtimeAnalysis.gap > 0 ? `${overtimeAnalysis.gap.toLocaleString()} ₪` : 'תקין'}
          </p>
        </div>
      </div>
    </Card>
  )
}
