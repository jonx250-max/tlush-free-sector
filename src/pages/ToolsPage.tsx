import { he } from '../i18n/he'
import { Calculator } from 'lucide-react'

export function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-cs-text">{he.nav.tools}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-cs-border bg-cs-surface p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cs-secondary/10">
            <Calculator size={24} className="text-cs-secondary" />
          </div>
          <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">מחשבון נטו-ברוטו</h3>
          <p className="text-sm text-cs-muted">חשב את המשכורת נטו מברוטו או להפך</p>
          <p className="mt-4 text-xs text-cs-primary">בקרוב...</p>
        </div>
      </div>
    </div>
  )
}
