// ============================================================
// Diff Engine — Contract vs Payslip Comparison
// Thin orchestrator; rules live under ./diff/
// ============================================================

import type { ContractTerms, ParsedPayslip, AnalysisFinding, DiffResult } from '../types'
import type { Settlement } from '../data/settlements'
import type { SectionContext } from './diff/context'
import { checkBasePay } from './diff/basePay'
import { checkMinimumWage } from './diff/minimumWage'
import { checkAmendment24 } from './diff/amendment24'
import { checkCommission } from './diff/commission'
import { checkOvertime } from './diff/overtime'
import { checkPension } from './diff/pension'
import { checkKerenHishtalmut } from './diff/kerenHishtalmut'
import { checkBenefits } from './diff/benefits'
import { checkTax } from './diff/tax'
import { buildOvertimeAnalysis } from './diff/overtimeAnalysis'
import { buildTaxAnalysis } from './diff/taxAnalysis'
import { buildSummary } from './diff/summary'

export interface ProfileData {
  gender: 'male' | 'female'
  childrenBirthYears: number[]
  academicDegree: 'none' | 'ba' | 'ma' | 'phd'
  degreeCompletionYear: number | null
  militaryService: { served: boolean; dischargeYear: number | null; monthsServed: number; isCombat: boolean }
  isNewImmigrant: boolean
  immigrationDate: string | null
  disabilityPercentage: number
  isSingleParent: boolean
  reservistDays2026: number
  settlement: Settlement | null
  yearsOfService: number
  workDaysPerWeek: 5 | 6
}

export function compare(
  contract: ContractTerms,
  payslip: ParsedPayslip,
  profile: ProfileData,
  year: number,
): DiffResult {
  const ctx: SectionContext = { contract, payslip, profile, year }
  const overtimeAnalysis = buildOvertimeAnalysis(ctx)
  const taxAnalysis = buildTaxAnalysis(ctx)

  const findings: AnalysisFinding[] = [
    ...checkBasePay(ctx),
    ...checkMinimumWage(ctx),
    ...checkAmendment24(ctx),
    ...checkCommission(ctx),
    ...checkOvertime(ctx),
    ...checkPension(ctx),
    ...checkKerenHishtalmut(ctx),
    ...checkTax(ctx, taxAnalysis),
    ...checkBenefits(ctx),
  ]

  return { findings, summary: buildSummary(findings), overtimeAnalysis, taxAnalysis }
}
