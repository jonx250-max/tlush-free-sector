import { useState, useCallback, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Stepper } from '../components/ui/Stepper'
import { Card } from '../components/ui/Card'
import { he } from '../i18n/he'
import { useAnalysis, useAnalysisStore } from '../hooks/useAnalysis'
import { useAuth } from '../lib/auth'
import { initPdfWorker } from '../lib/pdfWorkerSetup'
import { buildProfileData } from '../components/upload/buildProfileData'
import { ContractUploadStep } from '../components/upload/ContractUploadStep'
import { PayslipUploadStep } from '../components/upload/PayslipUploadStep'
import { ReviewStep } from '../components/upload/ReviewStep'

const STEPS = ['העלאת חוזה', 'העלאת תלוש', 'סקירה', 'ניתוח']

export function UploadPage() {
  const [step, setStep] = useState(0)
  const { parseContract, parsePayslip, runAnalysis, isParsingContract, isParsingPayslip, isAnalyzing, error } = useAnalysis()
  const store = useAnalysisStore()
  const { profile } = useAuth()

  useEffect(() => { initPdfWorker() }, [])

  const handleContractSelect = useCallback(async (file: File) => { await parseContract(file) }, [parseContract])
  const handlePayslipSelect = useCallback(async (file: File) => { await parsePayslip(file) }, [parsePayslip])
  const handleAnalyze = useCallback(() => {
    runAnalysis(buildProfileData(profile, store.contractTerms))
  }, [runAnalysis, store.contractTerms, profile])

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-heading text-2xl font-bold text-cs-text">{he.upload.title}</h1>
      <p className="mb-6 text-sm text-cs-muted">{he.upload.subtitle}</p>
      <Stepper steps={STEPS} currentStep={step} />
      {error && (
        <Card className="mb-4 border-cs-danger/30 bg-cs-danger/5">
          <div className="flex items-center gap-2 text-cs-danger">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}
      {step === 0 && (
        <ContractUploadStep onFileSelect={handleContractSelect} isParsing={isParsingContract} terms={store.contractTerms} onNext={next} />
      )}
      {step === 1 && (
        <PayslipUploadStep onFileSelect={handlePayslipSelect} isParsing={isParsingPayslip} payslip={store.payslip} onPrev={prev} onNext={next} />
      )}
      {step === 2 && (
        <ReviewStep
          terms={store.contractTerms}
          payslip={store.payslip}
          contractFileName={store.contractFileName}
          payslipFileName={store.payslipFileName}
          isAnalyzing={isAnalyzing}
          onPrev={prev}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  )
}
