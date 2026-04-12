import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-cs-text">{he.nav.profile}</h1>
      <div className="rounded-2xl border border-cs-border bg-cs-surface p-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cs-muted">{he.onboarding.fullName}</label>
            <p className="text-lg text-cs-text">{user?.fullName ?? '—'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-cs-muted">אימייל</label>
            <p className="text-lg text-cs-text">{user?.email ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
