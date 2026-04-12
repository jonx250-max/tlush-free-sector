import { he } from '../i18n/he'

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-cs-text">{he.nav.history}</h1>
      <div className="rounded-2xl border border-cs-border bg-cs-surface p-12 text-center">
        <p className="text-cs-muted">עדיין לא ביצעת בדיקות. התחל בדיקה חדשה כדי לראות תוצאות כאן.</p>
      </div>
    </div>
  )
}
