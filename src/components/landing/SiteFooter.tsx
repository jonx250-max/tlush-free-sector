import { he } from '../../i18n/he'

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c1222] py-10">
      <div className="mx-auto max-w-5xl px-6 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} {he.common.appName} — {he.common.appSubtitle}</p>
        <p className="mt-2">המידע באתר הוא לצרכי מידע בלבד ואינו מהווה ייעוץ משפטי.</p>
      </div>
    </footer>
  )
}
