// ============================================================
// Demand Letter Generator — מכתב דרישה
// Thin orchestrator; sections live under ./demandLetter/
// ============================================================

import type { DiffResult } from '../types'
import { round2 } from '../lib/numbers'
import { HEBREW_MONTHS } from './demandLetter/escapeHtml'
import { buildFindingsRows } from './demandLetter/findingsTable'
import { buildAmendment24Section } from './demandLetter/amendment24Section'
import { renderTemplate } from './demandLetter/template'

export interface DemandLetterInput {
  employeeName: string
  employeeId: string
  employerName: string
  employerId: string
  result: DiffResult
  payslipMonth: number
  payslipYear: number
}

export interface DemandLetterOutput {
  html: string
  totalClaimedAmount: number
  responseDeadline: string
}

export function generateDemandLetter(input: DemandLetterInput): DemandLetterOutput {
  const underpaid = input.result.findings.filter(
    f => f.gapDirection === 'underpaid' || f.gapDirection === 'missing_from_payslip',
  )
  const totalClaimedAmount = underpaid.reduce((sum, f) => sum + f.gap, 0)
  const responseDeadline = formatDeadline(30)
  const today = new Date().toLocaleDateString('he-IL')
  const monthName = HEBREW_MONTHS[input.payslipMonth - 1]

  const html = renderTemplate({
    employeeName: input.employeeName,
    employeeId: input.employeeId,
    employerName: input.employerName,
    employerId: input.employerId,
    monthName,
    year: input.payslipYear,
    today,
    responseDeadline,
    totalClaimedAmount,
    findingsRows: buildFindingsRows(underpaid),
    amendment24Section: buildAmendment24Section(input.result.findings, monthName, input.payslipYear),
  })

  return { html, totalClaimedAmount: round2(totalClaimedAmount), responseDeadline }
}

function formatDeadline(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toLocaleDateString('he-IL')
}
