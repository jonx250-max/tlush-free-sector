import type { SectionCheck } from './context'
import { analyzeCommissions } from '../commissionCalculator'

export const checkCommission: SectionCheck = (ctx) => {
  const { payslip, contract } = ctx
  if (!payslip.commissionPay || payslip.commissionPay <= 0) return []

  const result = analyzeCommissions(
    payslip.basePay ?? 0,
    payslip.commissionPay,
    payslip.pensionEmployee ?? 0,
    contract.pensionEmployeePct.value / 100,
  )
  if (result.isIncludedInPensionBase) return []
  return [{
    category: 'commission',
    fieldName: 'עמלות לא נכללות בבסיס לפנסיה',
    contractValue: null,
    payslipValue: payslip.commissionPay,
    gap: result.pensionShortfall,
    gapDirection: 'underpaid',
    severity: 'critical',
    legalReference: 'פסיקת בית הדין הארצי לעבודה — עמלות הן חלק מהשכר הקובע',
    explanation: `עמלות בסך ${payslip.commissionPay} ₪ לא נכללו בבסיס חישוב הפנסיה. חסר: ${result.pensionShortfall} ₪`,
  }]
}
