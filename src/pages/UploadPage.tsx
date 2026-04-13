import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/ui/Stepper'
import { FileDropzone } from '../components/ui/FileDropzone'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { FileText, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { he } from '../i18n/he'
import { useAnalysis, useAnalysisStore } from '../hooks/useAnalysis'
import { useAuth } from '../lib/auth'
import { initPdfWorker } from '../lib/pdfWorkerSetup'
import type { ProfileData } from '../services/diffEngine'

const STEPS = ['העלאת חוזה', 'העלאת תלוש', 'סקירה', 'ניתוח']

export function UploadPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [payslipFile, setPayslipFile] = useState<File | null>(null)
  const { parseContract, parsePayslip, runAnalysis, isParsingContract, isParsingPayslip, isAnalyzing, error } = useAnalysis()
  const store = useAnalysisStore()
  const { profile } = useAuth()

  useEffect(() => {
    initPdfWorker()
  }, [])

  const handleContractSelect = useCallback(async (file: File) => {
    setContractFile(file)
    await parseContract(file)
  }, [parseContract])

  const handlePayslipSelect = useCallback(async (file: File) => {
    setPayslipFile(file)
    await parsePayslip(file)
  }, [parsePayslip])

  const handleAnalyze = useCallback(() => {
    const pi = profile?.personalInfo
    const ei = profile?.employmentInfo
    const profileData: ProfileData = {
      gender: pi?.gender ?? 'male',
      childrenBirthYears: pi?.childrenBirthYears ?? [],
      academicDegree: pi?.academicDegree ?? 'none',
      militaryService: pi?.militaryService ?? { served: false },
      isNewImmigrant: pi?.isNewImmigrant ?? false,
      reservistDays: pi?.reservistDays2026 ?? 0,
      settlement: pi?.settlementName ?? null,
      workDaysPerWeek: ei?.workDaysPerWeek ?? store.contractTerms?.workDaysPerWeek.value ?? 5,
      pensionEmployeePct: ei?.pensionRateEmployee ?? store.contractTerms?.pensionEmployeePct.value ?? 6,
      pensionEmployerPct: ei?.pensionRateEmployer ?? store.contractTerms?.pensionEmployerPct.value ?? 6.5,
      hasKerenHishtalmut: ei?.hasKerenHishtalmut ?? (store.contractTerms?.kerenHishtalmutEmployeePct.value ?? null) !== null,
      kerenEmployeePct: ei?.kerenRateEmployee ?? store.contractTerms?.kerenHishtalmutEmployeePct.value ?? undefined,
      kerenEmployerPct: ei?.kerenRateEmployer ?? store.contractTerms?.kerenHishtalmutEmployerPct.value ?? undefined,
    }
    runAnalysis(profileData)
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
        <Card>
          <CardTitle>שלב 1: העלאת חוזה העסקה</CardTitle>
          <p className="mb-4 text-sm text-cs-muted">{he.upload.contractDescription}</p>
          <FileDropzone
            onFileSelect={handleContractSelect}
            label="גרור את חוזה ההעסקה לכאן"
            description="PDF של חוזה ההעסקה שלך"
          />
          {isParsingContract && (
            <div className="mt-3 flex items-center gap-2 text-sm text-cs-primary">
              <Loader2 size={16} className="animate-spin" />
              <span>מפענח את החוזה...</span>
            </div>
          )}
          {store.contractTerms && (
            <div className="mt-3 rounded-lg border border-cs-success/30 bg-cs-success/5 p-3 text-sm">
              <p className="font-medium text-cs-success">החוזה פוענח בהצלחה</p>
              <p className="text-cs-muted">שכר בסיס: {store.contractTerms.baseSalary.value.toLocaleString()} ₪ | מודל: {store.contractTerms.payModel.value}</p>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={next} disabled={!store.contractTerms || isParsingContract}>
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
          {isParsingPayslip && (
            <div className="mt-3 flex items-center gap-2 text-sm text-cs-primary">
              <Loader2 size={16} className="animate-spin" />
              <span>מפענח את התלוש...</span>
            </div>
          )}
          {store.payslip && (
            <div className="mt-3 rounded-lg border border-cs-success/30 bg-cs-success/5 p-3 text-sm">
              <p className="font-medium text-cs-success">התלוש פוענח בהצלחה</p>
              <p className="text-cs-muted">ברוטו: {store.payslip.grossSalary.toLocaleString()} ₪ | חודש {store.payslip.month}/{store.payslip.year}</p>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={prev}>הקודם</Button>
            <Button onClick={next} disabled={!store.payslip || isParsingPayslip}>
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
                <p className="font-medium text-cs-text">חוזה: {store.contractFileName}</p>
                {store.contractTerms && (
                  <p className="text-xs text-cs-muted">
                    שכר: {store.contractTerms.baseSalary.value.toLocaleString()} ₪ |
                    {' '}{store.contractTerms.workDaysPerWeek.value} ימים |
                    פנסיה: {store.contractTerms.pensionEmployeePct.value}%/{store.contractTerms.pensionEmployerPct.value}%
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
              <FileText size={20} className="text-cs-secondary" />
              <div>
                <p className="font-medium text-cs-text">תלוש: {store.payslipFileName}</p>
                {store.payslip && (
                  <p className="text-xs text-cs-muted">
                    ברוטו: {store.payslip.grossSalary.toLocaleString()} ₪ |
                    נטו: {store.payslip.netSalary.toLocaleString()} ₪ |
                    חודש {store.payslip.month}/{store.payslip.year}
                  </p>
                )}
              </div>
            </div>

            {store.contractTerms && hasLowConfidence(store.contractTerms) && (
              <div className="rounded-lg border border-cs-warning/30 bg-cs-warning/5 p-3 text-sm">
                <p className="font-medium text-cs-warning">שים לב: חלק מהשדות פוענחו ברמת ביטחון נמוכה</p>
                <p className="text-cs-muted">מומלץ לבדוק את הערכים בסקירה המפורטת</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={prev}>הקודם</Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <><Loader2 size={16} className="animate-spin" /> מנתח...</>
              ) : 'התחל ניתוח'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function hasLowConfidence(terms: NonNullable<ReturnType<typeof useAnalysisStore>>['contractTerms']): boolean {
  if (!terms) return false
  return [
    terms.baseSalary,
    terms.payModel,
    terms.pensionEmployeePct,
    terms.pensionEmployerPct,
  ].some(f => f.needsVerification)
}
