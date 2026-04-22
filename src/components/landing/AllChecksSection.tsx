import { motion, type MotionProps } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'
import { ALL_CHECKS } from './allChecks'

export function AllChecksSection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="all-checks" className="relative bg-[#070d1d] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div {...heading} className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">{he.landing.allChecksTitle}</h2>
          <p className="mt-3 text-white/60">{he.landing.allChecksSubtitle}</p>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ALL_CHECKS.map((cat, i) => (
            <motion.div key={cat.title} {...card(i * 0.08)} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
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
  )
}
