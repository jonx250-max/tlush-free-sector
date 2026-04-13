import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/ui/Stepper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { SettlementSelector } from '../components/ui/SettlementSelector'
import { Card } from '../components/ui/Card'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'
import type { Settlement } from '../data/settlements'
import type { PayModel, PersonalInfo } from '../types'

const STEPS = ['פרטים אישיים', 'פרטי העסקה', 'מודל שכר', 'סיכום']

interface PersonalData {
  fullName: string
  idNumber: string
  gender: 'male' | 'female'
  maritalStatus: string
  childrenBirthYears: string
  settlement: Settlement | null
  academicDegree: string
  degreeCompletionYear: string
  militaryServed: boolean
  militaryDischargeYear: string
  militaryMonths: string
  militaryCombat: boolean
  isNewImmigrant: boolean
  immigrationDate: string
  isSingleParent: boolean
  reservistDays: string
}

interface EmploymentData {
  employerName: string
  employerId: string
  jobTitle: string
  startDate: string
  payModel: PayModel
  workDaysPerWeek: '5' | '6'
}

interface PayModelData {
  pensionEmployee: string
  pensionEmployer: string
  hasKeren: boolean
  kerenEmployee: string
  kerenEmployer: string
  globalOvertimeHours: string
  globalOvertimeAmount: string
  hourlyRate: string
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [step, setStep] = useState(0)

  const [personal, setPersonal] = useState<PersonalData>({
    fullName: user?.fullName ?? '',
    idNumber: '',
    gender: 'male',
    maritalStatus: 'single',
    childrenBirthYears: '',
    settlement: null,
    academicDegree: 'none',
    degreeCompletionYear: '',
    militaryServed: false,
    militaryDischargeYear: '',
    militaryMonths: '',
    militaryCombat: false,
    isNewImmigrant: false,
    immigrationDate: '',
    isSingleParent: false,
    reservistDays: '',
  })

  const [employment, setEmployment] = useState<EmploymentData>({
    employerName: '',
    employerId: '',
    jobTitle: '',
    startDate: '',
    payModel: 'monthly',
    workDaysPerWeek: '5',
  })

  const [payModelData, setPayModelData] = useState<PayModelData>({
    pensionEmployee: '6',
    pensionEmployer: '6.5',
    hasKeren: true,
    kerenEmployee: '2.5',
    kerenEmployer: '7.5',
    globalOvertimeHours: '',
    globalOvertimeAmount: '',
    hourlyRate: '',
  })

  const updatePersonal = useCallback(<K extends keyof PersonalData>(key: K, value: PersonalData[K]) => {
    setPersonal(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateEmployment = useCallback(<K extends keyof EmploymentData>(key: K, value: EmploymentData[K]) => {
    setEmployment(prev => ({ ...prev, [key]: value }))
  }, [])

  const updatePayModel = useCallback(<K extends keyof PayModelData>(key: K, value: PayModelData[K]) => {
    setPayModelData(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleComplete = useCallback(() => {
    updateProfile({
      fullName: personal.fullName || user?.fullName || null,
      personalInfo: {
        gender: personal.gender,
        idNumber: personal.idNumber,
        maritalStatus: personal.maritalStatus as PersonalInfo['maritalStatus'],
        childrenBirthYears: personal.childrenBirthYears
          ? personal.childrenBirthYears.split(',').map(y => parseInt(y.trim())).filter(Boolean)
          : [],
        settlementName: personal.settlement?.name,
        academicDegree: personal.academicDegree as PersonalInfo['academicDegree'],
        degreeCompletionYear: personal.degreeCompletionYear ? parseInt(personal.degreeCompletionYear) : undefined,
        militaryService: personal.militaryServed
          ? {
              served: true,
              dischargeYear: personal.militaryDischargeYear ? parseInt(personal.militaryDischargeYear) : undefined,
              monthsServed: personal.militaryMonths ? parseInt(personal.militaryMonths) : undefined,
              isCombat: personal.militaryCombat,
            }
          : { served: false },
        isNewImmigrant: personal.isNewImmigrant,
        immigrationDate: personal.immigrationDate || undefined,
        isSingleParent: personal.isSingleParent,
        reservistDays2026: personal.reservistDays ? parseInt(personal.reservistDays) : 0,
      },
      employmentInfo: {
        employerName: employment.employerName,
        employerId: employment.employerId,
        jobTitle: employment.jobTitle,
        startDate: employment.startDate,
        payModel: employment.payModel,
        workDaysPerWeek: parseInt(employment.workDaysPerWeek) as 5 | 6,
        pensionRateEmployee: parseFloat(payModelData.pensionEmployee) || 6,
        pensionRateEmployer: parseFloat(payModelData.pensionEmployer) || 6.5,
        hasKerenHishtalmut: payModelData.hasKeren,
        kerenRateEmployee: payModelData.hasKeren ? parseFloat(payModelData.kerenEmployee) || 2.5 : undefined,
        kerenRateEmployer: payModelData.hasKeren ? parseFloat(payModelData.kerenEmployer) || 7.5 : undefined,
      },
    })
    navigate('/dashboard')
  }, [navigate, personal, employment, payModelData, updateProfile, user])

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-heading text-2xl font-bold text-cs-text">{he.onboarding.title}</h1>
      <p className="mb-6 text-sm text-cs-muted">{he.onboarding.subtitle}</p>

      <Stepper steps={STEPS} currentStep={step} />

      <Card>
        {step === 0 && (
          <PersonalInfoStep
            data={personal}
            onChange={updatePersonal}
          />
        )}
        {step === 1 && (
          <EmploymentStep
            data={employment}
            onChange={updateEmployment}
          />
        )}
        {step === 2 && (
          <PayModelStep
            payModel={employment.payModel}
            data={payModelData}
            onChange={updatePayModel}
          />
        )}
        {step === 3 && (
          <ReviewStep
            personal={personal}
            employment={employment}
            payModelData={payModelData}
          />
        )}

        <div className="mt-6 flex justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={prev}>הקודם</Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>הבא</Button>
          ) : (
            <Button onClick={handleComplete}>סיום והמשך</Button>
          )}
        </div>
      </Card>
    </div>
  )
}

// --- Step Components ---

function PersonalInfoStep({ data, onChange }: {
  data: PersonalData
  onChange: <K extends keyof PersonalData>(key: K, value: PersonalData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={he.onboarding.fullName} value={data.fullName} onChange={e => onChange('fullName', e.target.value)} />
        <Input label="תעודת זהות" value={data.idNumber} onChange={e => onChange('idNumber', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="מגדר"
          value={data.gender}
          onChange={e => onChange('gender', e.target.value as 'male' | 'female')}
          options={[{ value: 'male', label: 'זכר' }, { value: 'female', label: 'נקבה' }]}
        />
        <Select
          label="מצב משפחתי"
          value={data.maritalStatus}
          onChange={e => onChange('maritalStatus', e.target.value)}
          options={[
            { value: 'single', label: 'רווק/ה' },
            { value: 'married', label: 'נשוי/אה' },
            { value: 'divorced', label: 'גרוש/ה' },
            { value: 'widowed', label: 'אלמן/ה' },
          ]}
        />
      </div>

      <Input
        label="שנות לידה של ילדים (מופרד בפסיקים)"
        placeholder="2020, 2022, 2024"
        value={data.childrenBirthYears}
        onChange={e => onChange('childrenBirthYears', e.target.value)}
      />

      <SettlementSelector
        value={data.settlement}
        onChange={s => onChange('settlement', s)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="השכלה אקדמית"
          value={data.academicDegree}
          onChange={e => onChange('academicDegree', e.target.value)}
          options={[
            { value: 'none', label: 'ללא' },
            { value: 'ba', label: 'תואר ראשון' },
            { value: 'ma', label: 'תואר שני' },
            { value: 'phd', label: 'דוקטורט' },
          ]}
        />
        {data.academicDegree !== 'none' && (
          <Input
            label="שנת סיום תואר"
            type="number"
            value={data.degreeCompletionYear}
            onChange={e => onChange('degreeCompletionYear', e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="military"
          checked={data.militaryServed}
          onChange={e => onChange('militaryServed', e.target.checked)}
          className="h-4 w-4 rounded border-cs-border"
        />
        <label htmlFor="military" className="text-sm text-cs-text">שירתתי בצה"ל / שירות לאומי</label>
      </div>

      {data.militaryServed && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="שנת שחרור" type="number" value={data.militaryDischargeYear} onChange={e => onChange('militaryDischargeYear', e.target.value)} />
          <Input label="חודשי שירות" type="number" value={data.militaryMonths} onChange={e => onChange('militaryMonths', e.target.value)} />
          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-2">
              <input type="checkbox" id="combat" checked={data.militaryCombat} onChange={e => onChange('militaryCombat', e.target.checked)} className="h-4 w-4" />
              <label htmlFor="combat" className="text-sm">לוחם/ת</label>
            </div>
          </div>
        </div>
      )}

      <Input
        label="ימי מילואים בשנת 2026"
        type="number"
        value={data.reservistDays}
        onChange={e => onChange('reservistDays', e.target.value)}
        placeholder="0"
      />

      <div className="flex items-center gap-3">
        <input type="checkbox" id="singleParent" checked={data.isSingleParent} onChange={e => onChange('isSingleParent', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="singleParent" className="text-sm text-cs-text">הורה יחיד/נית</label>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="immigrant" checked={data.isNewImmigrant} onChange={e => onChange('isNewImmigrant', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="immigrant" className="text-sm text-cs-text">עולה חדש/ה</label>
      </div>

      {data.isNewImmigrant && (
        <Input label="תאריך עלייה" type="date" value={data.immigrationDate} onChange={e => onChange('immigrationDate', e.target.value)} />
      )}
    </div>
  )
}

function EmploymentStep({ data, onChange }: {
  data: EmploymentData
  onChange: <K extends keyof EmploymentData>(key: K, value: EmploymentData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <Input label="שם מעסיק" value={data.employerName} onChange={e => onChange('employerName', e.target.value)} />
      <Input label="ח.פ./ע.מ. מעסיק" value={data.employerId} onChange={e => onChange('employerId', e.target.value)} />
      <Input label="תפקיד" value={data.jobTitle} onChange={e => onChange('jobTitle', e.target.value)} />
      <Input label="תאריך תחילת עבודה" type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} />

      <Select
        label="מודל שכר"
        value={data.payModel}
        onChange={e => onChange('payModel', e.target.value as PayModel)}
        options={[
          { value: 'monthly', label: 'חודשי רגיל' },
          { value: 'hourly', label: 'שעתי' },
          { value: 'shift', label: 'משמרות' },
          { value: 'commission', label: 'בסיס + עמלות' },
          { value: 'global', label: 'שכר גלובלי (כולל שעות נוספות)' },
        ]}
      />

      {data.payModel === 'global' && (
        <div className="rounded-lg border border-cs-warning/30 bg-cs-warning/5 p-3">
          <p className="text-sm font-medium text-cs-warning">שים לב — שכר גלובלי</p>
          <p className="mt-1 text-xs text-cs-muted">
            לפי תיקון 24 לחוק הגנת השכר, המעסיק חייב לפרט בתלוש השכר את השעות הנוספות בנפרד מהשכר הבסיסי.
          </p>
        </div>
      )}

      <Select
        label="ימי עבודה בשבוע"
        value={data.workDaysPerWeek}
        onChange={e => onChange('workDaysPerWeek', e.target.value as '5' | '6')}
        options={[
          { value: '5', label: '5 ימים' },
          { value: '6', label: '6 ימים' },
        ]}
      />
    </div>
  )
}

function PayModelStep({ payModel, data, onChange }: {
  payModel: PayModel
  data: PayModelData
  onChange: <K extends keyof PayModelData>(key: K, value: PayModelData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-bold text-cs-text">הפרשות וניכויים</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="פנסיה עובד (%)" type="number" step="0.5" value={data.pensionEmployee} onChange={e => onChange('pensionEmployee', e.target.value)} />
        <Input label="פנסיה מעסיק (%)" type="number" step="0.5" value={data.pensionEmployer} onChange={e => onChange('pensionEmployer', e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="keren" checked={data.hasKeren} onChange={e => onChange('hasKeren', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="keren" className="text-sm text-cs-text">יש קרן השתלמות</label>
      </div>

      {data.hasKeren && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="קרן השתלמות עובד (%)" type="number" step="0.5" value={data.kerenEmployee} onChange={e => onChange('kerenEmployee', e.target.value)} />
          <Input label="קרן השתלמות מעסיק (%)" type="number" step="0.5" value={data.kerenEmployer} onChange={e => onChange('kerenEmployer', e.target.value)} />
        </div>
      )}

      {payModel === 'global' && (
        <>
          <h3 className="font-heading text-lg font-bold text-cs-text">שעות נוספות גלובליות</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="שעות נוספות כלולות בחודש" type="number" value={data.globalOvertimeHours} onChange={e => onChange('globalOvertimeHours', e.target.value)} />
            <Input label="סכום שעות נוספות גלובליות (₪)" type="number" value={data.globalOvertimeAmount} onChange={e => onChange('globalOvertimeAmount', e.target.value)} />
          </div>
        </>
      )}

      {payModel === 'hourly' && (
        <Input label="תעריף שעתי (₪)" type="number" value={data.hourlyRate} onChange={e => onChange('hourlyRate', e.target.value)} />
      )}
    </div>
  )
}

function ReviewStep({ personal, employment, payModelData }: {
  personal: PersonalData
  employment: EmploymentData
  payModelData: PayModelData
}) {
  const payModelLabel: Record<PayModel, string> = {
    monthly: 'חודשי רגיל',
    hourly: 'שעתי',
    shift: 'משמרות',
    commission: 'בסיס + עמלות',
    global: 'שכר גלובלי',
  }

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-bold text-cs-text">סיכום פרטים</h3>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">פרטים אישיים</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">שם:</span> {personal.fullName}</p>
          <p><span className="text-cs-muted">מגדר:</span> {personal.gender === 'male' ? 'זכר' : 'נקבה'}</p>
          {personal.settlement && (
            <p><span className="text-cs-muted">ישוב:</span> {personal.settlement.name}</p>
          )}
          {personal.childrenBirthYears && (
            <p><span className="text-cs-muted">ילדים:</span> {personal.childrenBirthYears}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">פרטי העסקה</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">מעסיק:</span> {employment.employerName}</p>
          <p><span className="text-cs-muted">תפקיד:</span> {employment.jobTitle}</p>
          <p><span className="text-cs-muted">מודל:</span> {payModelLabel[employment.payModel]}</p>
          <p><span className="text-cs-muted">ימי עבודה:</span> {employment.workDaysPerWeek}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">הפרשות</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">פנסיה עובד:</span> {payModelData.pensionEmployee}%</p>
          <p><span className="text-cs-muted">פנסיה מעסיק:</span> {payModelData.pensionEmployer}%</p>
          {payModelData.hasKeren && (
            <>
              <p><span className="text-cs-muted">קה"ש עובד:</span> {payModelData.kerenEmployee}%</p>
              <p><span className="text-cs-muted">קה"ש מעסיק:</span> {payModelData.kerenEmployer}%</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
