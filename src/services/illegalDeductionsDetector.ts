// SOURCE: חוק הגנת השכר תשי"ח-1958, סעיף 25
// מותר לנכות: מס, ביטוח לאומי/בריאות, פנסיה/קרן, חוב מוסכם בכתב, מקדמות.
// אסור: קנסות, נזק לרכוש (ללא הסכמה בכתב + ביטוח), חיוב על ציוד.

import type { PayslipEntry } from '../types'

const ALLOWED_KEYWORDS = [
  'מס הכנסה', 'מס', 'ביטוח לאומי', 'בריאות', 'פנסיה', 'גמל',
  'קרן השתלמות', 'השתלמות', 'הלוואה', 'מקדמה', 'חוב מוסכם',
  'דמי חבר', 'ועד', 'תרומה', 'הסתדרות',
]

const SUSPICIOUS_KEYWORDS = [
  'קנס', 'נזק', 'ציוד', 'מדים', 'אחריות', 'ביגוד', 'טלפון אישי',
  'חניה', 'ארוחות', 'קפה', 'מים', 'איחור',
]

export interface IllegalDeduction {
  code: string
  name: string
  amount: number
  reason: string
}

export interface IllegalDeductionsResult {
  suspiciousDeductions: IllegalDeduction[]
  totalSuspicious: number
}

export function detectIllegalDeductions(entries: PayslipEntry[]): IllegalDeductionsResult {
  const deductions = entries.filter(e => e.section === 'deductions' && e.amount > 0)
  const suspicious: IllegalDeduction[] = []

  for (const e of deductions) {
    const name = e.name.trim()
    const isAllowed = ALLOWED_KEYWORDS.some(k => name.includes(k))
    if (isAllowed) continue
    const matched = SUSPICIOUS_KEYWORDS.find(k => name.includes(k))
    if (matched) {
      suspicious.push({
        code: e.code, name: e.name, amount: e.amount,
        reason: `ניכוי "${matched}" — דורש הסכמה בכתב מראש (סעיף 25)`,
      })
    } else {
      suspicious.push({
        code: e.code, name: e.name, amount: e.amount,
        reason: 'ניכוי לא מזוהה — בדוק שיש הסכמה בכתב',
      })
    }
  }

  const totalSuspicious = round2(suspicious.reduce((s, d) => s + d.amount, 0))
  return { suspiciousDeductions: suspicious, totalSuspicious }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
