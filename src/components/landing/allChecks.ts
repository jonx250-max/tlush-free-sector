import { Clock, Coins, Wallet, LogOut, Banknote, Ban, type LucideIcon } from 'lucide-react'
import { he } from '../../i18n/he'

export interface CheckCategory {
  icon: LucideIcon
  title: string
  items: string[]
}

export const ALL_CHECKS: CheckCategory[] = [
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
