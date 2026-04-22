import { Link } from 'react-router-dom'
import { he } from '../../i18n/he'

const NAV_LINKS = [
  { label: 'איך זה עובד', href: '#how-it-works' },
  { label: 'יתרונות', href: '#features' },
  { label: 'אבטחה', href: '#security' },
]

export function SiteNav() {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed left-0 right-0 top-0 z-[100] flex h-16 items-center border-b border-white/10 bg-[#000a1f]/70 px-5 backdrop-blur-xl md:h-20 md:px-8"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <span className="text-xl font-black tracking-tight text-white md:text-2xl" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
          {he.common.appName}
        </span>
        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="text-sm font-bold tracking-wide text-white/60 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>
        <Link to="/login" className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#004a99] md:px-8 md:py-3 md:text-sm">
          כניסה מאובטחת
        </Link>
      </div>
    </nav>
  )
}
