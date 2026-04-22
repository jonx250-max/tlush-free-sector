import { FileText, Loader2 } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { hasLowConfidence } from './hasLowConfidence'
import type { ContractTerms, ParsedPayslip } from '../../types'

interface Props {
  terms: ContractTerms | null
  payslip: ParsedPayslip | null
  contractFileName: string | null
  payslipFileName: string | null
  isAnalyzing: boolean
  onPrev: () => void
  onAnalyze: () => void
}

export function ReviewStep({ terms, payslip, contractFileName, payslipFileName, isAnalyzing, onPrev, onAnalyze }: Props) {
  return (
    <Card>
      <CardTitle>שלב 3: סקירה לפני ניתוח</CardTitle>
      <div className="space-y-3">
        <ContractSummary terms={terms} fileName={contractFileName} />
        <PayslipSummary payslip={payslip} fileName={payslipFileName} />
        {hasLowConfidence(terms) && <LowConfidenceWarning />}
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={onPrev}>הקודם</Button>
        <Button onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (<><Loader2 size={16} className="animate-spin" /> מנתח...</>) : 'התחל ניתוח'}
        </Button>
      </div>
    </Card>
  )
}

function ContractSummary({ terms, fileName }: { terms: ContractTerms | null; fileName: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
      <FileText size={20} className="text-cs-primary" />
      <div>
        <p className="font-medium text-cs-text">חוזה: {fileName}</p>
        {terms && (
          <p className="text-xs text-cs-muted">
            שכר: {terms.baseSalary.value.toLocaleString()} ₪ |
            {' '}{terms.workDaysPerWeek.value} ימים |
            פנסיה: {terms.pensionEmployeePct.value}%/{terms.pensionEmployerPct.value}%
          </p>
        )}
      </div>
    </div>
  )
}

function PayslipSummary({ payslip, fileName }: { payslip: ParsedPayslip | null; fileName: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
      <FileText size={20} className="text-cs-secondary" />
      <div>
        <p className="font-medium text-cs-text">תלוש: {fileName}</p>
        {payslip && (
          <p className="text-xs text-cs-muted">
            ברוטו: {payslip.grossSalary.toLocaleString()} ₪ |
            נטו: {payslip.netSalary.toLocaleString()} ₪ |
            חודש {payslip.month}/{payslip.year}
          </p>
        )}
      </div>
    </div>
  )
}

function LowConfidenceWarning() {
  return (
    <div className="rounded-lg border border-cs-warning/30 bg-cs-warning/5 p-3 text-sm">
      <p className="font-medium text-cs-warning">שים לב: חלק מהשדות פוענחו ברמת ביטחון נמוכה</p>
      <p className="text-cs-muted">מומלץ לבדוק את הערכים בסקירה המפורטת</p>
    </div>
  )
}
