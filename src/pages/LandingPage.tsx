import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { he } from '../i18n/he'
import {
  Shield, FileText, TrendingUp, MapPin, ArrowLeft, CheckCircle,
  ShieldCheck, ShieldAlert, Lock, Loader2,
  Clock, Coins, Wallet, LogOut, Banknote, Ban,
} from 'lucide-react'

const ALL_CHECKS = [
  {
    icon: Clock,
    title: he.landing.catOvertime,
    items: [
      'שעות נוספות יומיות (125%/150%)',
      'שעות נוספות שבת/חג (175%/200%)',
      'שעות נוספות במשמרת',
      'שעות נוספות גלובליות (תיקון 24)',
    ],
  },
  {
    icon: Coins,
    title: he.landing.catSocial,
    items: [
      'הפרשות פנסיה מעסיק',
      'הפרשות פנסיה עובד',
      'קרן השתלמות עובד ומעסיק',
      'רכיב פיצויים בפנסיה',
    ],
  },
  {
    icon: Wallet,
    title: he.landing.catReimbursements,
    items: [
      'דמי הבראה',
      'החזר נסיעות',
      'דמי חגים',
      'שי לחג',
    ],
  },
  {
    icon: LogOut,
    title: he.landing.catTermination,
    items: [
      'פיצויי פיטורין + טופס 161',
      'הודעה מוקדמת',
      'פדיון חופשה שנתית',
      'פדיון ימי מחלה (לפי חוזה)',
    ],
  },
  {
    icon: Banknote,
    title: he.landing.catWage,
    items: [
      'שכר מינימום',
      'משכורת 13',
      'תוספת ותק',
      'מילואים — תשלום ימי שירות',
      'תוספת ערב/לילה',
    ],
  },
  {
    icon: Ban,
    title: he.landing.catDeductions,
    items: [
      'ניכויים בלתי חוקיים',
      'חוב שכר',
      'נקודות זיכוי במס',
      'הטבות אזוריות',
      'תאימות תיקון 24 — שכר גלובלי',
      'עמלות בבסיס לפנסיה',
    ],
  },
]
import { useAuth } from '../lib/auth'
import {
  isAuthCallbackRequest,
  stripAuthCallbackState,
  shouldShowAuthCallbackLoading,
  getPostAuthRedirectPath,
} from '../lib/authCallback'

export function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasCompletedProfile, isLoading } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const hasUser = Boolean(user)
  const sanitizedCallbackState = stripAuthCallbackState(location.search, location.hash)
  const hasAuthUrlResidue = sanitizedCallbackState.changed
  const isAuthCallbackPending = isAuthCallbackRequest(location.search)
  const postAuthRedirectPath = getPostAuthRedirectPath({
    isLoading,
    isAuthCallbackPending: hasAuthUrlResidue || isAuthCallbackPending,
    hasUser,
    hasCompletedProfile,
  })
  const showLoading =
    shouldShowAuthCallbackLoading({
      isLoading,
      hasUser,
      isAuthCallbackPending: hasAuthUrlResidue || isAuthCallbackPending,
    }) || Boolean(postAuthRedirectPath)

  // Redirect after successful auth
  useEffect(() => {
    if (!postAuthRedirectPath) return
    navigate(postAuthRedirectPath, { replace: true })
  }, [navigate, postAuthRedirectPath])

  // Clean auth params from URL
  useEffect(() => {
    if (isLoading || hasUser || !hasAuthUrlResidue) return
    navigate(
      {
        pathname: location.pathname,
        search: sanitizedCallbackState.search,
        hash: sanitizedCallbackState.hash,
      },
      { replace: true },
    )
  }, [hasAuthUrlResidue, hasUser, isLoading, location.pathname, navigate, sanitizedCallbackState.hash, sanitizedCallbackState.search])

  // Auth loading screen
  if (showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000a1f]" dir="rtl">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-400" />
          <p className="mt-4 text-lg font-medium text-white/80">מתחבר...</p>
        </div>
      </div>
    )
  }

  const fadeUp = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.75, ease: 'easeOut' as const },
      }

  const fadeInView = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { duration: 0.65, delay },
        }

  return (
    <div className="min-h-screen bg-[#000a1f]" dir="rtl" style={{ fontFamily: "'Heebo', 'Assistant', sans-serif" }}>
      {/* ── Glass Navbar ── */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed left-0 right-0 top-0 z-[100] flex h-16 items-center border-b border-white/10 bg-[#000a1f]/70 px-5 backdrop-blur-xl md:h-20 md:px-8"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <span className="text-xl font-black tracking-tight text-white md:text-2xl" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
            {he.common.appName}
          </span>
          <div className="hidden items-center gap-10 md:flex">
            {[
              { label: 'איך זה עובד', href: '#how-it-works' },
              { label: 'יתרונות', href: '#features' },
              { label: 'אבטחה', href: '#security' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-bold tracking-wide text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <Link
            to="/login"
            className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#004a99] md:px-8 md:py-3 md:text-sm"
          >
            כניסה מאובטחת
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative flex items-center overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,197,253,0.12),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(191,219,254,0.06),transparent_22%)]" />
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          {/* Glow orbs */}
          <div className="absolute -top-40 right-[-8rem] h-[600px] w-[600px] rounded-full bg-cyan-500/20 blur-[120px]" aria-hidden="true" />
          <div className="absolute bottom-[-10rem] left-[-7rem] h-[600px] w-[600px] rounded-full bg-amber-500/20 blur-[120px]" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000a1f] via-[#000a1f]/50 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <motion.div {...fadeUp} className="max-w-4xl space-y-8 md:space-y-10">
            {/* Status badge */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-bold tracking-wider text-white/70">
                מערכת פעילה ומאובטחת
              </span>
              <span className="hidden text-xs font-bold tracking-wider text-white/35 md:inline">
                כלי עצמאי לבדיקת תלושי שכר — מגזר פרטי
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1
                className="text-[2.8rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[7rem]"
                style={{ fontFamily: "'Noto Serif Hebrew', serif", textShadow: '0 0 30px rgba(252, 211, 77, 0.3)' }}
              >
                {he.landing.heroTitle.split('?')[0]}
                <br />
                <span className="text-amber-400" style={{ textShadow: '0 0 15px rgba(252, 211, 77, 0.4)' }}>
                  מגיע לך?
                </span>
              </h1>

              <p
                className="mt-6 max-w-2xl text-lg font-normal leading-8 text-white/90 md:mt-7 md:text-2xl md:leading-relaxed"
                style={{ textShadow: '0 1px 16px rgba(0,0,0,0.55)' }}
              >
                {he.landing.heroSubtitle}
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:gap-5">
              <Link
                to="/login"
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-[#000a1f] shadow-[0_10px_50px_-10px_rgba(251,191,36,0.5)] transition-all hover:scale-105 sm:w-auto md:px-10 md:py-5 md:text-xl"
              >
                {he.landing.ctaButton}
                <ArrowLeft className="h-6 w-6" aria-hidden="true" />
              </Link>
              <Link
                to="/login?demo=true"
                className="w-full cursor-pointer rounded-xl border-2 border-white/20 px-8 py-4 text-center text-lg font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 sm:w-auto md:px-10 md:py-5 md:text-xl"
              >
                {he.common.tryDemo}
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative bg-[#0c1222] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2 {...fadeInView()} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
            {he.landing.howItWorks}
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: he.landing.step1Title, desc: he.landing.step1Desc, icon: FileText },
              { step: '2', title: he.landing.step2Title, desc: he.landing.step2Desc, icon: ShieldCheck },
              { step: '3', title: he.landing.step3Title, desc: he.landing.step3Desc, icon: CheckCircle },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <motion.div
                key={step}
                {...fadeInView(i * 0.15)}
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-amber-400/30 hover:bg-white/[0.07]"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0057b8]/20 text-cyan-400">
                  <Icon size={28} />
                </div>
                <div className="mb-2 text-sm font-bold text-amber-400">שלב {step}</div>
                <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2 {...fadeInView()} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
            {he.landing.features}
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { icon: Shield, title: he.landing.featureAmendment24, desc: he.landing.featureAmendment24Desc },
              { icon: TrendingUp, title: he.landing.featureCommissions, desc: he.landing.featureCommissionsDesc },
              { icon: FileText, title: he.landing.featureOvertime, desc: he.landing.featureOvertimeDesc },
              { icon: MapPin, title: he.landing.featureTax, desc: he.landing.featureTaxDesc },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                {...fadeInView(i * 0.1)}
                className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/30"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#0057b8]/20">
                  <Icon size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-bold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All 29 Checks ── */}
      <section id="all-checks" className="relative bg-[#070d1d] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fadeInView()} className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">{he.landing.allChecksTitle}</h2>
            <p className="mt-3 text-white/60">{he.landing.allChecksSubtitle}</p>
          </motion.div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ALL_CHECKS.map((cat, i) => (
              <motion.div
                key={cat.title}
                {...fadeInView(i * 0.08)}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                    <cat.icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  {cat.items.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle size={14} className="mt-1 flex-shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="relative bg-[#0c1222] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2 {...fadeInView()} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
            אבטחת מידע
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Lock, title: 'פענוח מקומי', desc: 'קבצי PDF מפוענחים בדפדפן שלך בלבד — לא נשלחים לשום שרת.' },
              { icon: ShieldAlert, title: 'שמירה מצומצמת', desc: 'תוצאות נשמרות זמנית ב-sessionStorage. אין אחסון קבוע של מסמכים.' },
              { icon: ShieldCheck, title: 'אפס המצאות', desc: 'אם חסרים נתונים — המערכת עוצרת. אין ניחושים, אין מסקנות מומצאות.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                {...fadeInView(i * 0.12)}
                className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Icon size={22} className="text-emerald-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Badge ── */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div {...fadeInView()}>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400">
              <CheckCircle size={16} />
              {he.landing.trustTitle}
            </div>
            <p className="mt-4 text-white/50">{he.landing.trustDesc}</p>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#000a1f]/90 p-3 backdrop-blur-xl md:hidden">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-base font-bold text-[#000a1f]"
        >
          {he.landing.ctaButton}
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-[#0c1222] py-10">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-white/40">
          <p>© {new Date().getFullYear()} {he.common.appName} — {he.common.appSubtitle}</p>
          <p className="mt-2">המידע באתר הוא לצרכי מידע בלבד ואינו מהווה ייעוץ משפטי.</p>
        </div>
      </footer>
    </div>
  )
}
