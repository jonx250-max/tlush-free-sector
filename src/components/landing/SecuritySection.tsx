import { motion, type MotionProps } from 'framer-motion'
import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react'

const ITEMS = [
  { icon: Lock, title: 'פענוח מקומי', desc: 'קבצי PDF מפוענחים בדפדפן שלך בלבד — לא נשלחים לשום שרת.' },
  { icon: ShieldAlert, title: 'שמירה מצומצמת', desc: 'תוצאות נשמרות זמנית ב-sessionStorage. אין אחסון קבוע של מסמכים.' },
  { icon: ShieldCheck, title: 'אפס המצאות', desc: 'אם חסרים נתונים — המערכת עוצרת. אין ניחושים, אין מסקנות מומצאות.' },
]

export function SecuritySection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="security" className="relative bg-[#0c1222] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">אבטחת מידע</motion.h2>
        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...card(i * 0.12)} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
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
  )
}
