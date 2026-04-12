import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'
import { Upload, History, Wrench, ArrowLeft } from 'lucide-react'

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-cs-text">
          שלום, {user?.fullName ?? 'משתמש'}
        </h1>
        <p className="mt-2 text-cs-muted">
          בדוק את התלוש שלך מול חוזה ההעסקה ומצא פערים
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link
          to="/upload"
          className="group rounded-2xl border-2 border-cs-primary/20 bg-cs-primary/5 p-6 transition hover:border-cs-primary hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cs-primary text-white">
            <Upload size={24} />
          </div>
          <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">בדיקה חדשה</h3>
          <p className="text-sm text-cs-muted">העלה חוזה ותלוש לניתוח</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-cs-primary">
            התחל
            <ArrowLeft size={14} className="transition group-hover:-translate-x-1" />
          </div>
        </Link>

        <Link
          to="/history"
          className="group rounded-2xl border border-cs-border bg-cs-surface p-6 transition hover:border-cs-primary/30 hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-cs-muted">
            <History size={24} />
          </div>
          <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">היסטוריה</h3>
          <p className="text-sm text-cs-muted">צפה בבדיקות קודמות</p>
        </Link>

        <Link
          to="/tools"
          className="group rounded-2xl border border-cs-border bg-cs-surface p-6 transition hover:border-cs-primary/30 hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-cs-muted">
            <Wrench size={24} />
          </div>
          <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">כלים</h3>
          <p className="text-sm text-cs-muted">מחשבון נטו-ברוטו ועוד</p>
        </Link>
      </div>
    </div>
  )
}
