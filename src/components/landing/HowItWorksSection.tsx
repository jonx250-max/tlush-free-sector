import { motion, type MotionProps } from 'framer-motion'
import { FileText, ShieldCheck, CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'

const STEPS = [
  { step: '1', title: he.landing.step1Title, desc: he.landing.step1Desc, icon: FileText },
  { step: '2', title: he.landing.step2Title, desc: he.landing.step2Desc, icon: ShieldCheck },
  { step: '3', title: he.landing.step3Title, desc: he.landing.step3Desc, icon: CheckCircle },
]

export function HowItWorksSection({ heading, step }: { heading: MotionProps; step: (delay?: number) => MotionProps }) {
  return (
    <section id="how-it-works" className="relative bg-[#0c1222] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
          {he.landing.howItWorks}
        </motion.h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map(({ step: s, title, desc, icon: Icon }, i) => (
            <motion.div key={s} {...step(i * 0.15)} className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-amber-400/30 hover:bg-white/[0.07]">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0057b8]/20 text-cyan-400">
                <Icon size={28} />
              </div>
              <div className="mb-2 text-sm font-bold text-amber-400">שלב {s}</div>
              <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
