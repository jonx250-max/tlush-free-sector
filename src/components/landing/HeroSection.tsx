import { Link } from 'react-router-dom'
import { motion, type MotionProps } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { he } from '../../i18n/he'

export function HeroSection({ fadeUpProps }: { fadeUpProps: MotionProps }) {
  return (
    <header className="relative flex items-center overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <HeroBackground />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-14 md:px-8 md:py-20">
        <motion.div {...fadeUpProps} className="max-w-4xl space-y-8 md:space-y-10">
          <StatusBadge />
          <Headline />
          <CtaRow />
        </motion.div>
      </div>
    </header>
  )
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right_in_oklab,rgba(147,197,253,0.12),rgba(147,197,253,0)_28%),radial-gradient(circle_at_18%_18%_in_oklab,rgba(191,219,254,0.06),rgba(191,219,254,0)_22%)]" />
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute -top-40 right-[-8rem] h-[600px] w-[600px] rounded-full bg-cyan-500/20 blur-[120px]" aria-hidden="true" />
      <div className="absolute bottom-[-10rem] left-[-7rem] h-[600px] w-[600px] rounded-full bg-amber-500/20 blur-[120px]" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#000a1f] via-[#000a1f]/50 to-transparent" />
    </div>
  )
}

function StatusBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
      </span>
      <span className="text-xs font-bold tracking-wider text-white/70">מערכת פעילה ומאובטחת</span>
      <span className="hidden text-xs font-bold tracking-wider text-white/35 md:inline">
        כלי עצמאי לבדיקת תלושי שכר — מגזר פרטי
      </span>
    </div>
  )
}

function Headline() {
  return (
    <div>
      <h1 className="text-[2.8rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[7rem]"
          style={{ fontFamily: "'Noto Serif Hebrew', serif", textShadow: '0 0 30px rgba(252, 211, 77, 0.3)' }}>
        {he.landing.heroTitle.split('?')[0]}
        <br />
        <span className="text-amber-400" style={{ textShadow: '0 0 15px rgba(252, 211, 77, 0.4)' }}>מגיע לך?</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg font-normal leading-8 text-white/90 md:mt-7 md:text-2xl md:leading-relaxed"
         style={{ textShadow: '0 1px 16px rgba(0,0,0,0.55)' }}>
        {he.landing.heroSubtitle}
      </p>
    </div>
  )
}

function CtaRow() {
  return (
    <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:gap-5">
      <Link to="/login" className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-[#000a1f] shadow-[0_10px_50px_-10px_rgba(251,191,36,0.5)] transition-all hover:scale-105 sm:w-auto md:px-10 md:py-5 md:text-xl">
        {he.landing.ctaButton}
        <ArrowLeft className="h-6 w-6" aria-hidden="true" />
      </Link>
      <Link to="/login?demo=true" className="w-full cursor-pointer rounded-xl border-2 border-white/20 px-8 py-4 text-center text-lg font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 sm:w-auto md:px-10 md:py-5 md:text-xl">
        {he.common.tryDemo}
      </Link>
    </div>
  )
}
