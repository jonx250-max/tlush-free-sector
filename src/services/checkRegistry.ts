// Central registry mapping check_id → metadata.
// Used by analyze pipeline (P5) to route findings per plan tier.
//
// Each entry indicates which depth tier (basic/pro/premium) includes
// the check, and which existing service handles it. Plan §4.4.

export type DepthTier = 'free' | 'basic' | 'pro' | 'premium'

export interface CheckMeta {
  id: string
  category: 'salary' | 'benefits' | 'tax' | 'rights' | 'compliance'
  minTier: DepthTier
  service: string // file name reference for human review
  status: 'implemented' | 'partial' | 'stub_data_pending'
}

const FREE = ['salary_minimum', 'pension_basic', 'overtime_flag'] as const

const BASIC_ADD = [
  'pension_full', 'overtime', 'severance', 'recovery_fund',
  'sickness_days', 'vacation_days', 'travel_expenses', 'meal_allowance',
  'holiday_pay', 'holiday_gift', 'advance_notice',
] as const

const PRO_ADD = [
  'collective_agreement_match', 'extension_order_check', 'reserve_duty',
  'maternity', 'study_fund', 'salary_drift_yoy', 'tax_credit_optimization',
  'expense_recognition', 'commute_distance_calc', 'shift_premium',
  'holiday_premium', 'illness_continuation', 'bonus_calculation',
  'allowances_audit',
] as const

const PREMIUM_ADD = [
  'options_rsu', 'special_leaves', 'workplace_change', 'dispute_handling',
] as const

export const CHECK_REGISTRY: CheckMeta[] = [
  // Free (3)
  { id: 'salary_minimum', category: 'salary', minTier: 'free', service: 'minimumWageValidator', status: 'implemented' },
  { id: 'pension_basic', category: 'salary', minTier: 'free', service: 'diff/pension', status: 'implemented' },
  { id: 'overtime_flag', category: 'salary', minTier: 'free', service: 'overtimeCalculator', status: 'implemented' },

  // Basic (+11 more = 14 total)
  { id: 'pension_full', category: 'salary', minTier: 'basic', service: 'diff/pension', status: 'implemented' },
  { id: 'overtime', category: 'salary', minTier: 'basic', service: 'overtimeCalculator', status: 'implemented' },
  { id: 'severance', category: 'salary', minTier: 'basic', service: 'severanceCalculator', status: 'implemented' },
  { id: 'recovery_fund', category: 'salary', minTier: 'basic', service: 'recuperationCalculator', status: 'implemented' },
  { id: 'sickness_days', category: 'salary', minTier: 'basic', service: 'leaveCalculator', status: 'implemented' },
  { id: 'vacation_days', category: 'salary', minTier: 'basic', service: 'leaveCalculator', status: 'implemented' },
  { id: 'travel_expenses', category: 'benefits', minTier: 'basic', service: 'commuteCalculator', status: 'partial' },
  { id: 'meal_allowance', category: 'benefits', minTier: 'basic', service: 'diff/benefits', status: 'partial' },
  { id: 'holiday_pay', category: 'benefits', minTier: 'basic', service: 'holidayPayCalculator', status: 'implemented' },
  { id: 'holiday_gift', category: 'benefits', minTier: 'basic', service: 'holidayGiftCalculator', status: 'implemented' },
  { id: 'advance_notice', category: 'salary', minTier: 'basic', service: 'advanceNoticeCalculator', status: 'implemented' },

  // Pro (+14 more = 28 total at this tier; final 1 in premium = 29)
  { id: 'collective_agreement_match', category: 'compliance', minTier: 'pro', service: 'collectiveAgreementMatcher', status: 'stub_data_pending' },
  { id: 'extension_order_check', category: 'compliance', minTier: 'pro', service: 'extensionOrderRegistry', status: 'stub_data_pending' },
  { id: 'reserve_duty', category: 'rights', minTier: 'pro', service: 'tax/credits/reservist', status: 'partial' },
  { id: 'maternity', category: 'rights', minTier: 'pro', service: 'maternityBenefitCalculator', status: 'implemented' },
  { id: 'study_fund', category: 'rights', minTier: 'pro', service: 'diff/kerenHishtalmut', status: 'implemented' },
  { id: 'salary_drift_yoy', category: 'tax', minTier: 'pro', service: 'salaryDriftDetector', status: 'implemented' },
  { id: 'tax_credit_optimization', category: 'tax', minTier: 'pro', service: 'tax/creditPoints', status: 'implemented' },
  { id: 'expense_recognition', category: 'tax', minTier: 'pro', service: 'expenseRecognizer', status: 'implemented' },
  { id: 'commute_distance_calc', category: 'benefits', minTier: 'pro', service: 'commuteCalculator', status: 'partial' },
  { id: 'shift_premium', category: 'benefits', minTier: 'pro', service: 'shiftDifferentialCalculator', status: 'implemented' },
  { id: 'holiday_premium', category: 'benefits', minTier: 'pro', service: 'holidayPayCalculator', status: 'implemented' },
  { id: 'illness_continuation', category: 'rights', minTier: 'pro', service: 'illegalDeductionsDetector', status: 'partial' },
  { id: 'bonus_calculation', category: 'benefits', minTier: 'pro', service: 'thirteenthSalaryCalculator', status: 'implemented' },
  { id: 'allowances_audit', category: 'tax', minTier: 'pro', service: 'diff/benefits', status: 'implemented' },

  // Premium (+4 more = 29 total. Premium also adds DELIVERABLES — letter, rights, bot — not new checks)
  { id: 'options_rsu', category: 'tax', minTier: 'premium', service: 'optionsRsuCalculator', status: 'implemented' },
  { id: 'special_leaves', category: 'rights', minTier: 'premium', service: 'specialLeavesValidator', status: 'implemented' },
  { id: 'workplace_change', category: 'compliance', minTier: 'premium', service: 'workplaceChangeValidator', status: 'implemented' },
  { id: 'dispute_handling', category: 'compliance', minTier: 'premium', service: 'disputeHandlingOrchestrator', status: 'implemented' },
]

export function checksForTier(tier: DepthTier): string[] {
  if (tier === 'free') return [...FREE]
  if (tier === 'basic') return [...FREE, ...BASIC_ADD]
  if (tier === 'pro') return [...FREE, ...BASIC_ADD, ...PRO_ADD]
  return [...FREE, ...BASIC_ADD, ...PRO_ADD, ...PREMIUM_ADD]
}

export function getCheckMeta(id: string): CheckMeta | undefined {
  return CHECK_REGISTRY.find(c => c.id === id)
}
