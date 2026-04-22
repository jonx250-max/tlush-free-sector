import type { AnalysisFinding } from '../../types'
import { escapeHtml } from './escapeHtml'

const TD = 'padding: 8px; border: 1px solid #ddd;'
const TD_CENTER = `${TD} text-align: center;`
const TD_GAP = `${TD_CENTER} color: #DC2626; font-weight: bold;`
const TD_SMALL = `${TD} font-size: 12px;`

function fmtMoney(n: number | null): string {
  return n !== null ? `${n.toLocaleString()} ₪` : '—'
}

export function buildFindingsRows(findings: AnalysisFinding[]): string {
  return findings.map(f => `
      <tr>
        <td style="${TD}">${escapeHtml(f.fieldName)}</td>
        <td style="${TD_CENTER}">${fmtMoney(f.contractValue)}</td>
        <td style="${TD_CENTER}">${fmtMoney(f.payslipValue)}</td>
        <td style="${TD_GAP}">${f.gap.toLocaleString()} ₪</td>
        <td style="${TD_SMALL}">${escapeHtml(f.legalReference ?? '')}</td>
      </tr>
    `).join('')
}
