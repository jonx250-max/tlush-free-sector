import type { SectionCheck } from './context'
import { validateAmendment24 } from '../amendment24Validator'

export const checkAmendment24: SectionCheck = (ctx) => {
  const result = validateAmendment24(
    ctx.contract.overtimeModel.value,
    ctx.payslip.basePay,
    ctx.payslip.globalOvertimeLine,
    ctx.payslip.grossSalary,
  )
  if (result.compliant) return []
  return [{
    category: 'amendment24',
    fieldName: 'תיקון 24 — הפרדת שעות נוספות',
    contractValue: null,
    payslipValue: null,
    gap: 0,
    gapDirection: 'missing_from_payslip',
    severity: 'critical',
    legalReference: result.legalReference,
    explanation: result.explanation,
  }]
}
