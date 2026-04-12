import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'
import { LayoutDashboard, Upload, History, User, Wrench, LogOut } from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/dashboard', label: he.nav.dashboard, icon: LayoutDashboard },
  { to: '/upload', label: he.nav.upload, icon: Upload },
  { to: '/history', label: he.nav.history, icon: History },
  { to: '/tools', label: he.nav.tools, icon: Wrench },
  { to: '/profile', label: he.nav.profile, icon: User },
] as const

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-cs-bg" dir="rtl">
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">
        דלג לתוכן הראשי
      </a>

      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-l border-cs-border bg-cs-surface">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-cs-border px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cs-primary text-white">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M8 10h16M8 16h12M8 22h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="4" fill="#059669"/>
              <path d="M22.5 22l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="font-heading text-sm font-bold text-cs-text">{he.common.appName}</div>
            <div className="text-xs text-cs-muted">{he.common.appSubtitle}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4" aria-label="ניווט ראשי">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-cs-primary/10 text-cs-primary'
                      : 'text-cs-muted hover:bg-gray-100 hover:text-cs-text dark:hover:bg-gray-800',
                  )}
                >
                  <Icon size={20} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-cs-border px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cs-primary/10 text-cs-primary">
              <User size={18} />
            </div>
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium text-cs-text">
                {user?.fullName ?? user?.email ?? 'משתמש'}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-cs-muted transition hover:bg-red-50 hover:text-cs-danger"
          >
            <LogOut size={16} />
            {he.auth.signOut}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto p-8" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
