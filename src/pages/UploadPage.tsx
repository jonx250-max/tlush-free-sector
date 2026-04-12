import { useState, useCallback } from 'react'
import { Stepper } from '../components/ui/Stepper'
import { FileDropzone } from '../components/ui/FileDropzone'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { FileText, ArrowLeft } from 'lucide-react'
import { he } from '../i18n/he'

const STEPS = ['העלאת חוזה', 'העלאת תלוש', 'סקירה', 'ניתוח']

export function UploadPage() {
  const [step, setStep] = useState(0)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [payslipFile, setPayslipFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleContractSelect = useCallback((file: File) => {
    setContractFile(file)
  }, [])

  const handlePayslipSelect = useCallback((file: File) => {
    setPayslipFile(file)
  }, [])

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    // Future: parse PDFs → run diff engine → navigate to results
    await new Promise(r => setTimeout(r, 2000))
    setIsAnalyzing(false)
    setStep(3)
  }, [])

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-heading text-2xl font-bold text-cs-text">{he.upload.title}</h1>
      <p className="mb-6 text-sm text-cs-muted">{he.upload.subtitle}</p>

      <Stepper steps={STEPS} currentStep={step} />

      {step === 0 && (
        <Card>
          <CardTitle>שלב 1: העלאת חוזה העסקה</CardTitle>
          <p className="mb-4 text-sm text-cs-muted">{he.upload.contractDescription}</p>
          <FileDropzone
            onFileSelect={handleContractSelect}
            label="גרור את חוזה ההעסקה לכאן"
            description="PDF של חוזה ההעסקה שלך"
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={next} disabled={!contractFile}>
              הבא <ArrowLeft size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardTitle>שלב 2: העלאת תלוש שכר</CardTitle>
          <p className="mb-4 text-sm text-cs-muted">{he.upload.payslipDescription}</p>
          <FileDropzone
            onFileSelect={handlePayslipSelect}
            label="גרור את תלוש השכר לכאן"
            description="PDF של תלוש השכר החודשי"
          />
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={prev}>הקודם</Button>
            <Button onClick={next} disabled={!payslipFile}>
              הבא <ArrowLeft size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardTitle>שלב 3: סקירה לפני ניתוח</CardTitle>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
              <FileText size={20} className="text-cs-primary" />
              <div>
                <p className="font-medium text-cs-text">חוזה: {contractFile?.name}</p>
                <p className="text-xs text-cs-muted">{contractFile && `${(contractFile.size / 1024).toFixed(0)} KB`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
              <FileText size={20} className="text-cs-secondary" />
              <div>
                <p className="font-medium text-cs-text">תלוש: {payslipFile?.name}</p>
                <p className="text-xs text-cs-muted">{payslipFile && `${(payslipFile.size / 1024).toFixed(0)} KB`}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={prev}>הקודם</Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? 'מנתח...' : 'התחל ניתוח'}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cs-success/10">
              <FileText size={32} className="text-cs-success" />
            </div>
            <h3 className="font-heading text-lg font-bold text-cs-text">הניתוח הושלם</h3>
            <p className="mt-2 text-sm text-cs-muted">עבור לדף התוצאות לצפייה בפירוט המלא</p>
            <Button className="mt-4">צפה בתוצאות</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
