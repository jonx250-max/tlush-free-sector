import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'
import { LayoutDashboard, Upload, History, User, Wrench, LogOut, Menu, X } from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/dashboard', label: he.nav.dashboard, icon: LayoutDashboard },
  { to: '/upload', label: he.nav.upload, icon: Upload },
  { to: '/history', label: he.nav.history, icon: History },
  { to: '/tools', label: he.nav.tools, icon: Wrench },
  { to: '/profile', label: he.nav.profile, icon: User },
] as const

function SidebarContent({ user, signOut, onNavClick }: {
  user: ReturnType<typeof useAuth>['user']
  signOut: () => void
  onNavClick?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-cs-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0057b8] text-white">
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
                onClick={onNavClick}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#0057b8]/10 text-[#0057b8]'
                    : 'text-cs-muted hover:bg-gray-100 hover:text-cs-text',
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0057b8]/10 text-[#0057b8]">
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
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-cs-muted transition hover:bg-red-50 hover:text-cs-danger"
        >
          <LogOut size={16} />
          {he.auth.signOut}
        </button>
      </div>
    </>
  )
}

export function Layout() {
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-cs-bg" dir="rtl">
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">
        דלג לתוכן הראשי
      </a>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-l border-cs-border bg-white md:flex">
        <SidebarContent user={user} signOut={signOut} />
      </aside>

      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-cs-border bg-white/90 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0057b8] text-white">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M8 10h16M8 16h12M8 22h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-cs-text">{he.common.appName}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cursor-pointer rounded-lg p-2 text-cs-muted hover:bg-gray-100"
          aria-label={mobileMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <SidebarContent user={user} signOut={signOut} onNavClick={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto p-4 pt-18 md:p-8 md:pt-8" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
