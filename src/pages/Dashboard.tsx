import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Upload, History, Wrench, ArrowLeft, UserCog, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'בוקר טוב'
  if (hour < 17) return 'צהריים טובים'
  if (hour < 21) return 'ערב טוב'
  return 'לילה טוב'
}

export function Dashboard() {
  const { user, hasCompletedProfile } = useAuth()

  const fadeIn = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  })

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome */}
      <motion.div {...fadeIn(0)} className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-cs-text">
          {getGreeting()}, {user?.fullName ?? 'משתמש'}
        </h1>
        <p className="mt-2 text-cs-muted">
          בדוק את התלוש שלך מול חוזה ההעסקה ומצא פערים
        </p>
      </motion.div>

      {/* Profile completion prompt */}
      {!hasCompletedProfile && (
        <motion.div {...fadeIn(0.1)}>
          <Link
            to="/onboarding"
            className="mb-8 flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-50 p-5 transition-all hover:border-amber-400/50 hover:shadow-md"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
              <UserCog size={22} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-base font-bold text-cs-text">השלם את הפרופיל שלך</h3>
              <p className="text-sm text-cs-muted">הוסף פרטים אישיים ותעסוקתיים לחישוב מדויק של נקודות זיכוי והטבות מס</p>
            </div>
            <ArrowLeft size={18} className="text-amber-600" />
          </Link>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div {...fadeIn(0.15)}>
          <Link
            to="/upload"
            className="group block rounded-2xl border-2 border-[#0057b8]/20 bg-[#0057b8]/5 p-6 transition hover:border-[#0057b8] hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0057b8] text-white">
              <Upload size={24} />
            </div>
            <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">בדיקה חדשה</h3>
            <p className="text-sm text-cs-muted">העלה חוזה ותלוש לניתוח</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#0057b8]">
              התחל
              <ArrowLeft size={14} className="transition group-hover:-translate-x-1" />
            </div>
          </Link>
        </motion.div>

        <motion.div {...fadeIn(0.2)}>
          <Link
            to="/history"
            className="group block rounded-2xl border border-cs-border bg-white p-6 transition hover:border-[#0057b8]/30 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-cs-muted">
              <History size={24} />
            </div>
            <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">היסטוריה</h3>
            <p className="text-sm text-cs-muted">צפה בבדיקות קודמות</p>
          </Link>
        </motion.div>

        <motion.div {...fadeIn(0.25)}>
          <Link
            to="/tools"
            className="group block rounded-2xl border border-cs-border bg-white p-6 transition hover:border-[#0057b8]/30 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-cs-muted">
              <Wrench size={24} />
            </div>
            <h3 className="mb-1 font-heading text-lg font-bold text-cs-text">כלים</h3>
            <p className="text-sm text-cs-muted">מחשבון נטו-ברוטו ועוד</p>
          </Link>
        </motion.div>
      </div>

      {/* System status */}
      <motion.div {...fadeIn(0.3)} className="mt-8 flex items-center justify-center gap-2 text-sm text-cs-muted">
        <CheckCircle size={14} className="text-emerald-500" />
        <span>המערכת פעילה — כל המידע מעובד מקומית במכשיר שלך</span>
      </motion.div>
    </div>
  )
}
