import { useMemo } from 'react'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react'
import type { DiffResult, AnalysisFinding, Severity } from '../types'
import { he } from '../i18n/he'

interface ResultsPageProps {
  result: DiffResult | null
}

export function ResultsPage({ result }: ResultsPageProps) {
  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-center text-cs-muted">אין תוצאות להצגה. העלה חוזה ותלוש כדי לקבל ניתוח.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-cs-text">{he.results.title}</h1>

      <ResultsSummary result={result} />
      <Amendment24Alert findings={result.findings} />
      <FindingsTable findings={result.findings} />
      <TaxSummary result={result} />
      <OvertimeSummary result={result} />

      <div className="flex gap-3">
        <Button variant="primary">
          <FileText size={16} />
          {he.results.generateLetter}
        </Button>
        <Button variant="outline">
          <Download size={16} />
          {he.results.downloadReport}
        </Button>
      </div>
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

  return (
    <Card className="border-cs-danger/30 bg-cs-danger/5">
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

function FindingsTable({ findings }: { findings: AnalysisFinding[] }) {
  const sorted = useMemo(() =>
    [...findings].sort((a, b) => {
      const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    }),
    [findings],
  )

  if (sorted.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-cs-success">
          <CheckCircle size={24} />
          <p className="font-medium">לא נמצאו פערים — התלוש תואם את החוזה</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>ממצאים מפורטים</CardTitle>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-cs-border text-right">
              <th className="pb-2 pr-2 font-medium text-cs-muted">חומרה</th>
              <th className="pb-2 font-medium text-cs-muted">שדה</th>
              <th className="pb-2 font-medium text-cs-muted">חוזה</th>
              <th className="pb-2 font-medium text-cs-muted">תלוש</th>
              <th className="pb-2 font-medium text-cs-muted">פער</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <tr key={i} className="border-b border-cs-border/50 last:border-0">
                <td className="py-3 pr-2">
                  <SeverityBadge severity={f.severity} />
                </td>
                <td className="py-3">
                  <p className="font-medium text-cs-text">{f.fieldName}</p>
                  <p className="text-xs text-cs-muted">{f.explanation}</p>
                  {f.legalReference && (
                    <p className="text-xs text-cs-primary">{f.legalReference}</p>
                  )}
                </td>
                <td className="py-3 text-cs-text">
                  {f.contractValue !== null ? `${f.contractValue.toLocaleString()} ₪` : '—'}
                </td>
                <td className="py-3 text-cs-text">
                  {f.payslipValue !== null ? `${f.payslipValue.toLocaleString()} ₪` : '—'}
                </td>
                <td className={`py-3 font-bold ${
                  f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip'
                    ? 'text-cs-danger'
                    : f.gapDirection === 'overpaid' ? 'text-cs-warning' : 'text-cs-success'
                }`}>
                  {f.gap > 0 ? `${f.gap.toLocaleString()} ₪` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
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
