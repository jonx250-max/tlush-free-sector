import { Link } from 'react-router-dom'
import { he } from '../i18n/he'
import { Shield, FileText, TrendingUp, MapPin, ArrowLeft, CheckCircle } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cs-bg" dir="rtl">
      {/* Header */}
      <header className="border-b border-cs-border bg-cs-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cs-primary text-white">
              <FileText size={20} />
            </div>
            <span className="font-heading text-lg font-bold">{he.common.appName}</span>
          </div>
          <Link
            to="/login"
            className="rounded-xl bg-cs-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cs-primary-dark"
          >
            כניסה
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-cs-primary/5 via-cs-bg to-cs-secondary/5 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="mb-6 font-heading text-4xl font-extrabold leading-tight text-cs-text md:text-5xl">
            {he.landing.heroTitle}
          </h1>
          <p className="mb-10 text-lg text-cs-muted md:text-xl">
            {he.landing.heroSubtitle}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl bg-cs-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-cs-primary-dark hover:shadow-xl"
            >
              {he.landing.ctaButton}
              <ArrowLeft size={20} />
            </Link>
            <Link
              to="/login?demo=true"
              className="flex items-center gap-2 rounded-2xl border-2 border-cs-border px-8 py-4 text-lg font-semibold text-cs-text transition hover:border-cs-primary hover:text-cs-primary"
            >
              {he.common.tryDemo}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-14 text-center font-heading text-3xl font-bold text-cs-text">
            {he.landing.howItWorks}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: he.landing.step1Title, desc: he.landing.step1Desc, icon: '📄' },
              { step: '2', title: he.landing.step2Title, desc: he.landing.step2Desc, icon: '📋' },
              { step: '3', title: he.landing.step3Title, desc: he.landing.step3Desc, icon: '✅' },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative rounded-2xl border border-cs-border bg-cs-surface p-8 text-center shadow-sm">
                <div className="mb-4 text-4xl">{icon}</div>
                <div className="mb-2 text-sm font-bold text-cs-primary">שלב {step}</div>
                <h3 className="mb-3 font-heading text-xl font-bold text-cs-text">{title}</h3>
                <p className="text-sm text-cs-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cs-surface py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-14 text-center font-heading text-3xl font-bold text-cs-text">
            {he.landing.features}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { icon: Shield, title: he.landing.featureAmendment24, desc: he.landing.featureAmendment24Desc },
              { icon: TrendingUp, title: he.landing.featureCommissions, desc: he.landing.featureCommissionsDesc },
              { icon: FileText, title: he.landing.featureOvertime, desc: he.landing.featureOvertimeDesc },
              { icon: MapPin, title: he.landing.featureTax, desc: he.landing.featureTaxDesc },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-cs-border bg-cs-bg p-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cs-primary/10">
                  <Icon size={24} className="text-cs-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">{title}</h3>
                  <p className="text-sm text-cs-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cs-success/10 px-4 py-2 text-sm font-medium text-cs-success">
            <CheckCircle size={16} />
            {he.landing.trustTitle}
          </div>
          <p className="mt-4 text-cs-muted">{he.landing.trustDesc}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cs-border bg-cs-surface py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-cs-muted">
          <p>© {new Date().getFullYear()} {he.common.appName} — {he.common.appSubtitle}</p>
          <p className="mt-2">המידע באתר הוא לצרכי מידע בלבד ואינו מהווה ייעוץ משפטי.</p>
        </div>
      </footer>
    </div>
  )
}
