import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { he } from '../../i18n/he'

export function MobileStickyCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#000a1f]/90 p-3 backdrop-blur-xl md:hidden">
      <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-base font-bold text-[#000a1f]">
        {he.landing.ctaButton}
        <ArrowLeft size={18} />
      </Link>
    </div>
  )
}
