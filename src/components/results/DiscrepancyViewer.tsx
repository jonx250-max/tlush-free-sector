/**
 * Stage H1 — Side-by-side discrepancy viewer.
 *
 * Two-pane RTL layout: contract (right) + payslip (left), one row per
 * AnalysisFinding. Center gutter shows severity colour + the gap value.
 * Click a row to expand legalReference + suggested action.
 *
 * Mobile (<sm): collapses to stacked rows so we can keep readable
 * line-lengths. The "side-by-side" framing is preserved by labelling
 * each value with `חוזה:` / `תלוש:` icons.
 *
 * Pure presentational; consumes the same `AnalysisFinding[]` the rest
 * of ResultsPage already shows. Doesn't replace `CategoryGroupedFindings`
 * — appears as a complementary view via the toggle in ResultsPage.
 */

import { useState } from 'react'
import { ChevronDown, FileText, Scroll, Scale } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Card, CardTitle } from '../ui/Card'
import type { AnalysisFinding, Severity } from '../../types'

const SEVERITY_GUTTER: Record<Severity, string> = {
  critical: 'bg-cs-danger',
  warning: 'bg-cs-warning',
  info: 'bg-cs-primary',
}

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-cs-danger',
  warning: 'text-cs-warning',
  info: 'text-cs-primary',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'קריטי',
  warning: 'אזהרה',
  info: 'מידע',
}

const currency = (n: number | null) =>
  n === null
    ? '—'
    : new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

interface Props {
  findings: AnalysisFinding[]
}

export function DiscrepancyViewer({ findings }: Props) {
  // Sort by severity desc, then gap desc
  const sorted = [...findings].sort((a, b) => {
    const sev: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity]
    return b.gap - a.gap
  })

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-cs-border px-6 py-4">
        <CardTitle>השוואה צד-ליד</CardTitle>
        <div className="hidden gap-4 text-xs text-cs-muted sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <Scroll size={14} aria-hidden="true" /> חוזה
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Scale size={14} aria-hidden="true" /> פער
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} aria-hidden="true" /> תלוש
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-cs-muted">לא נמצאו פערים — התלוש תואם את החוזה.</p>
      ) : (
        <ul className="divide-y divide-cs-border/50">
          {sorted.map((f, i) => <Row key={i} finding={f} />)}
        </ul>
      )}
    </Card>
  )
}

function Row({ finding: f }: { finding: AnalysisFinding }) {
  const [open, setOpen] = useState(false)
  const id = `disc-row-${f.fieldName.replace(/\s+/g, '-')}`

  const isUnderpaid =
    f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip'

  return (
    <li className="tlush-finding-row" data-severity={f.severity}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-stretch text-right hover:bg-cs-bg/40 focus-visible:bg-cs-bg/60 focus-visible:outline-none"
      >
        {/* Severity gutter */}
        <span className={`w-1.5 shrink-0 ${SEVERITY_GUTTER[f.severity]}`} aria-hidden="true" />

        <div className="flex flex-1 flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
          {/* Contract (right in RTL) */}
          <div className="order-1 sm:order-1 sm:text-right">
            <p className="flex items-center gap-2 text-xs font-medium text-cs-muted sm:hidden">
              <Scroll size={12} aria-hidden="true" /> חוזה
            </p>
            <p className="font-medium text-cs-text">{f.fieldName}</p>
            <p className="font-mono text-sm text-cs-text">{currency(f.contractValue)}</p>
          </div>

          {/* Center gutter — severity + gap */}
          <div className="order-3 flex items-center justify-center gap-2 sm:order-2 sm:flex-col sm:gap-1">
            <Badge variant={f.severity === 'critical' ? 'critical' : f.severity === 'warning' ? 'warning' : 'info'}>
              {SEVERITY_LABEL[f.severity]}
            </Badge>
            <p className={`font-mono text-sm font-bold ${isUnderpaid ? SEVERITY_TEXT[f.severity] : 'text-cs-success'}`}>
              {f.gap > 0 ? currency(f.gap) : '—'}
            </p>
          </div>

          {/* Payslip (left in RTL) */}
          <div className="order-2 sm:order-3 sm:text-left">
            <p className="flex items-center gap-2 text-xs font-medium text-cs-muted sm:hidden">
              <FileText size={12} aria-hidden="true" /> תלוש
            </p>
            <p className="font-mono text-sm text-cs-text">{currency(f.payslipValue)}</p>
            <p className="text-xs text-cs-muted">
              {f.gapDirection === 'underpaid' && 'תת-תשלום'}
              {f.gapDirection === 'overpaid' && 'תשלום-יתר'}
              {f.gapDirection === 'missing_from_payslip' && 'חסר בתלוש'}
              {f.gapDirection === 'match' && 'תקין'}
            </p>
          </div>
        </div>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`mx-3 self-center text-cs-muted transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div
          id={id}
          className="border-t border-cs-border/40 bg-cs-bg/40 px-4 py-3 text-sm"
        >
          <p className="text-cs-text">{f.explanation}</p>
          {f.legalReference && (
            <p className="mt-2 text-xs text-cs-primary">{f.legalReference}</p>
          )}
        </div>
      )}
    </li>
  )
}
