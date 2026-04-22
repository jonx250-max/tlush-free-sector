import { motion, type MotionProps } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'

export function TrustSection({ anim }: { anim: MotionProps }) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...anim}>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400">
            <CheckCircle size={16} />
            {he.landing.trustTitle}
          </div>
          <p className="mt-4 text-white/50">{he.landing.trustDesc}</p>
        </motion.div>
      </div>
    </section>
  )
}
