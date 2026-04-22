import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { FileDropzone } from '../ui/FileDropzone'
import { he } from '../../i18n/he'
import type { ParsedPayslip } from '../../types'

interface Props {
  onFileSelect: (file: File) => void
  isParsing: boolean
  payslip: ParsedPayslip | null
  onPrev: () => void
  onNext: () => void
}

export function PayslipUploadStep({ onFileSelect, isParsing, payslip, onPrev, onNext }: Props) {
  return (
    <Card>
      <CardTitle>שלב 2: העלאת תלוש שכר</CardTitle>
      <p className="mb-4 text-sm text-cs-muted">{he.upload.payslipDescription}</p>
      <FileDropzone
        onFileSelect={onFileSelect}
        label="גרור את תלוש השכר לכאן"
        description="PDF של תלוש השכר החודשי"
      />
      {isParsing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-cs-primary">
          <Loader2 size={16} className="animate-spin" />
          <span>מפענח את התלוש...</span>
        </div>
      )}
      {payslip && (
        <div className="mt-3 rounded-lg border border-cs-success/30 bg-cs-success/5 p-3 text-sm">
          <p className="font-medium text-cs-success">התלוש פוענח בהצלחה</p>
          <p className="text-cs-muted">ברוטו: {payslip.grossSalary.toLocaleString()} ₪ | חודש {payslip.month}/{payslip.year}</p>
        </div>
      )}
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={onPrev}>הקודם</Button>
        <Button onClick={onNext} disabled={!payslip || isParsing}>
          הבא <ArrowLeft size={16} />
        </Button>
      </div>
    </Card>
  )
}
