import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { FileDropzone } from '../ui/FileDropzone'
import { he } from '../../i18n/he'
import type { ContractTerms } from '../../types'

interface Props {
  onFileSelect: (file: File) => void
  isParsing: boolean
  terms: ContractTerms | null
  onNext: () => void
}

export function ContractUploadStep({ onFileSelect, isParsing, terms, onNext }: Props) {
  return (
    <Card>
      <CardTitle>שלב 1: העלאת חוזה העסקה</CardTitle>
      <p className="mb-4 text-sm text-cs-muted">{he.upload.contractDescription}</p>
      <FileDropzone
        onFileSelect={onFileSelect}
        label="גרור את חוזה ההעסקה לכאן"
        description="PDF של חוזה ההעסקה שלך"
      />
      {isParsing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-cs-primary">
          <Loader2 size={16} className="animate-spin" />
          <span>מפענח את החוזה...</span>
        </div>
      )}
      {terms && (
        <div className="mt-3 rounded-lg border border-cs-success/30 bg-cs-success/5 p-3 text-sm">
          <p className="font-medium text-cs-success">החוזה פוענח בהצלחה</p>
          <p className="text-cs-muted">שכר בסיס: {terms.baseSalary.value.toLocaleString()} ₪ | מודל: {terms.payModel.value}</p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onNext} disabled={!terms || isParsing}>
          הבא <ArrowLeft size={16} />
        </Button>
      </div>
    </Card>
  )
}
