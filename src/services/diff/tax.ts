import type { TaxSectionCheck } from './context'
import { TOLERANCE } from './context'

export const checkTax: TaxSectionCheck = (_ctx, analysis) => {
  if (analysis.overcharge <= TOLERANCE) return []
  return [{
    category: 'income_tax',
    fieldName: 'מס הכנסה ביתר',
    contractValue: analysis.expectedTax,
    payslipValue: analysis.actualTax,
    gap: analysis.overcharge,
    gapDirection: 'overpaid',
    severity: 'warning',
    legalReference: 'פקודת מס הכנסה',
    explanation: `נוכה מס ${analysis.actualTax} ₪ במקום ${analysis.expectedTax} ₪ — ייתכן שחסרות נקודות זיכוי`,
  }]
}
