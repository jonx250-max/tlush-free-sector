import { motion, type MotionProps } from 'framer-motion'
import { Shield, FileText, TrendingUp, MapPin } from 'lucide-react'
import { he } from '../../i18n/he'

const FEATURES = [
  { icon: Shield, title: he.landing.featureAmendment24, desc: he.landing.featureAmendment24Desc },
  { icon: TrendingUp, title: he.landing.featureCommissions, desc: he.landing.featureCommissionsDesc },
  { icon: FileText, title: he.landing.featureOvertime, desc: he.landing.featureOvertimeDesc },
  { icon: MapPin, title: he.landing.featureTax, desc: he.landing.featureTaxDesc },
]

export function FeaturesSection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
          {he.landing.features}
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...card(i * 0.1)} className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/30">
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
  )
}
