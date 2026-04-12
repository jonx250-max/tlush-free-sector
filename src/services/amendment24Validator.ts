// ============================================================
// Amendment 24 Validator — חוק הגנת השכר, תיקון 24
// Global salary must be properly separated in payslip
// ============================================================

export interface Amendment24Result {
  compliant: boolean
  entireAmountIsBase: boolean
  missingOvertimeLine: boolean
  explanation: string
  legalReference: string
}

/**
 * Validate Amendment 24 compliance.
 * When contract specifies global salary (שכר גלובלי):
 * 1. Payslip MUST show base salary and overtime separately
 * 2. Cannot lump everything into one "base salary" line
 * 3. The overtime portion must be explicitly labeled
 */
export function validateAmendment24(
  contractOvertimeModel: 'standard' | 'global' | 'none',
  payslipBasePay: number | null,
  payslipGlobalOvertimeLine: number | null,
  payslipGrossSalary: number,
): Amendment24Result {
  const legalReference = 'תיקון 24 לחוק הגנת השכר, התשי"ח-1958 — סעיף 5(ב)(7)'

  // Only relevant for global salary model
  if (contractOvertimeModel !== 'global') {
    return {
      compliant: true,
      entireAmountIsBase: false,
      missingOvertimeLine: false,
      explanation: 'מודל שכר רגיל — תיקון 24 לא רלוונטי',
      legalReference,
    }
  }

  // Check: is there a separate overtime line in the payslip?
  if (payslipGlobalOvertimeLine === null || payslipGlobalOvertimeLine === 0) {
    // No separation — entire amount treated as base
    const entireAmountIsBase = payslipBasePay !== null &&
      Math.abs(payslipBasePay - payslipGrossSalary) < 100 // tolerance for small deductions

    return {
      compliant: false,
      entireAmountIsBase,
      missingOvertimeLine: true,
      explanation: entireAmountIsBase
        ? 'תלוש השכר מציג את כל הסכום כשכר בסיס ללא הפרדת שעות נוספות גלובליות — הפרה של תיקון 24'
        : 'חסרה שורת שעות נוספות גלובליות בתלוש השכר — הפרה של תיקון 24',
      legalReference,
    }
  }

  // Has separation — compliant
  return {
    compliant: true,
    entireAmountIsBase: false,
    missingOvertimeLine: false,
    explanation: 'תלוש השכר מפריד כנדרש בין שכר בסיס לשעות נוספות גלובליות',
    legalReference,
  }
}
