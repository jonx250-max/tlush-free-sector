// Detects legitimate non-taxable expense reimbursements and
// flags suspicious "expense" entries that should be taxable salary.
// SOURCE: סעיף 2(2) פק' מס הכנסה — החזר הוצאות לעובד פטור ממס

export type ExpenseType =
  | 'travel' | 'meal' | 'phone' | 'home_office' | 'professional_fees'
  | 'uniform' | 'training' | 'tools_equipment'

export interface ExpenseEntry {
  type: ExpenseType
  monthlyAmount: number
  hasReceipt?: boolean
}

export interface ExpenseAnalysis {
  recognized: ExpenseEntry[]
  suspicious: { entry: ExpenseEntry; reason: string }[]
  totalRecognizedNis: number
  totalSuspiciousNis: number
}

const MONTHLY_CAPS_NIS_2026: Record<ExpenseType, number> = {
  travel: 850,
  meal: 850,
  phone: 200,
  home_office: 600,
  professional_fees: 400,
  uniform: 250,
  training: 1200,
  tools_equipment: 500,
}

export function recognizeExpenses(entries: ExpenseEntry[]): ExpenseAnalysis {
  const recognized: ExpenseEntry[] = []
  const suspicious: { entry: ExpenseEntry; reason: string }[] = []

  for (const e of entries) {
    const cap = MONTHLY_CAPS_NIS_2026[e.type]
    if (e.monthlyAmount <= cap) {
      recognized.push(e)
    } else {
      suspicious.push({
        entry: e,
        reason: `סכום ${e.monthlyAmount}₪ עולה על תקרת ${cap}₪ ל-${e.type} — חלק עשוי להיות חייב במס`,
      })
    }
  }

  return {
    recognized,
    suspicious,
    totalRecognizedNis: sum(entries.map(e => Math.min(e.monthlyAmount, MONTHLY_CAPS_NIS_2026[e.type]))),
    totalSuspiciousNis: sum(suspicious.map(s => s.entry.monthlyAmount - MONTHLY_CAPS_NIS_2026[s.entry.type])),
  }
}

function sum(arr: number[]): number {
  return Math.round(arr.reduce((a, b) => a + b, 0))
}
