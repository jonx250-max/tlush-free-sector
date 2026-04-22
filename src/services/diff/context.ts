import type { ContractTerms, ParsedPayslip, AnalysisFinding, TaxAnalysis } from '../../types'
import type { ProfileData } from '../diffEngine'

export interface SectionContext {
  contract: ContractTerms
  payslip: ParsedPayslip
  profile: ProfileData
  year: number
}

export type SectionCheck = (ctx: SectionContext) => AnalysisFinding[]
export type TaxSectionCheck = (ctx: SectionContext, analysis: TaxAnalysis) => AnalysisFinding[]

export const TOLERANCE = 50
