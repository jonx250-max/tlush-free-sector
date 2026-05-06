/**
 * Stage H8 — empty-result + manual-review banner.
 *
 * Two intents in one component:
 *
 *   <EmptyState kind="no-result"/>   when ResultsPage has no analysis loaded.
 *   <EmptyState kind="needs-review" findings={...}/> when a critical
 *     finding consumed a low-confidence contract field, or a finding
 *     used provisional law data — the user is told the result is
 *     trustworthy-ish and should be human-checked.
 *
 * The banner auto-suppresses if no provisional / low-confidence finding
 * exists.
 */

import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileSearch } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import type { AnalysisFinding } from '../../types'

const PROVISIONAL_NOTE_RE = /אומדן\s+זמני|provisional/i
const LOW_CONFIDENCE_NOTE_RE = /ביטחון\s+(?:נמוך|בינוני)/

interface NoResultProps {
  kind: 'no-result'
}

interface NeedsReviewProps {
  kind: 'needs-review'
  findings: AnalysisFinding[]
}

type Props = NoResultProps | NeedsReviewProps

export function EmptyState(props: Props) {
  const navigate = useNavigate()

  if (props.kind === 'no-result') {
    return (
      <Card className="text-center">
        <FileSearch size={48} className="mx-auto text-cs-muted" aria-hidden="true" />
        <CardTitle className="mt-3">אין תוצאות להצגה</CardTitle>
        <p className="mt-2 text-sm text-cs-muted">
          העלה חוזה ותלוש שכר כדי להתחיל ניתוח. ניתן לחזור גם אחרי שמילאת פרטים בפרופיל.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('/upload')}>העלה חוזה ותלוש</Button>
          <Button variant="outline" onClick={() => navigate('/profile')}>עדכן פרופיל</Button>
        </div>
      </Card>
    )
  }

  // needs-review banner
  const flagged = props.findings.filter(f =>
    PROVISIONAL_NOTE_RE.test(f.explanation) || LOW_CONFIDENCE_NOTE_RE.test(f.explanation),
  )
  if (flagged.length === 0) return null

  return (
    <Card className="border-cs-warning/40 bg-cs-warning/5">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-cs-warning" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-cs-warning">חלק מהממצאים מבוססים על נתונים זמניים או חילוץ בביטחון נמוך</p>
          <p className="mt-1 text-cs-text">
            יש {flagged.length} ממצאים שדורשים בדיקה ידנית: ייתכן שערכי החוק טרם אומתו לשנה זו או שהפרסר זיהה ערך בחוזה בביטחון נמוך.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-cs-muted">ראה פירוט</summary>
            <ul className="mt-2 list-disc space-y-1 pr-5 text-xs text-cs-muted">
              {flagged.slice(0, 6).map((f, i) => (
                <li key={i}>{f.fieldName}: {f.explanation}</li>
              ))}
              {flagged.length > 6 && <li>ועוד {flagged.length - 6}…</li>}
            </ul>
          </details>
        </div>
      </div>
    </Card>
  )
}
