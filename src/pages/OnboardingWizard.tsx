import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/ui/Stepper'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'
import type { PersonalData, EmploymentData, PayModelData, Setter } from '../components/onboarding/types'
import { buildProfilePatch } from '../components/onboarding/buildProfilePatch'
import { PersonalInfoStep } from '../components/onboarding/PersonalInfoStep'
import { EmploymentStep } from '../components/onboarding/EmploymentStep'
import { PayModelStep } from '../components/onboarding/PayModelStep'
import { ReviewStep } from '../components/onboarding/ReviewStep'

const STEPS = ['פרטים אישיים', 'פרטי העסקה', 'מודל שכר', 'סיכום']

const INITIAL_PERSONAL: PersonalData = {
  fullName: '', idNumber: '', gender: 'male', maritalStatus: 'single',
  childrenBirthYears: '', settlement: null, academicDegree: 'none',
  degreeCompletionYear: '', militaryServed: false, militaryDischargeYear: '',
  militaryMonths: '', militaryCombat: false, isNewImmigrant: false,
  immigrationDate: '', isSingleParent: false, reservistDays: '',
}

const INITIAL_EMPLOYMENT: EmploymentData = {
  employerName: '', employerId: '', jobTitle: '', startDate: '',
  payModel: 'monthly', workDaysPerWeek: '5',
}

const INITIAL_PAY: PayModelData = {
  pensionEmployee: '6', pensionEmployer: '6.5', hasKeren: true,
  kerenEmployee: '2.5', kerenEmployer: '7.5',
  globalOvertimeHours: '', globalOvertimeAmount: '', hourlyRate: '',
}

function useFieldSetter<T>(setState: Dispatch<SetStateAction<T>>): Setter<T> {
  return useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [setState])
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<PersonalData>({ ...INITIAL_PERSONAL, fullName: user?.fullName ?? '' })
  const [employment, setEmployment] = useState<EmploymentData>(INITIAL_EMPLOYMENT)
  const [pay, setPay] = useState<PayModelData>(INITIAL_PAY)

  const updatePersonal = useFieldSetter(setPersonal)
  const updateEmployment = useFieldSetter(setEmployment)
  const updatePay = useFieldSetter(setPay)

  const handleComplete = useCallback(() => {
    updateProfile(buildProfilePatch(personal, employment, pay, user?.fullName ?? null))
    navigate('/dashboard')
  }, [navigate, personal, employment, pay, updateProfile, user])

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-heading text-2xl font-bold text-cs-text">{he.onboarding.title}</h1>
      <p className="mb-6 text-sm text-cs-muted">{he.onboarding.subtitle}</p>
      <Stepper steps={STEPS} currentStep={step} />
      <Card>
        {step === 0 && <PersonalInfoStep data={personal} onChange={updatePersonal} />}
        {step === 1 && <EmploymentStep data={employment} onChange={updateEmployment} />}
        {step === 2 && <PayModelStep payModel={employment.payModel} data={pay} onChange={updatePay} />}
        {step === 3 && <ReviewStep personal={personal} employment={employment} payModelData={pay} />}
        <div className="mt-6 flex justify-between">
          {step > 0 ? <Button variant="ghost" onClick={prev}>הקודם</Button> : <div />}
          {step < STEPS.length - 1
            ? <Button onClick={next}>הבא</Button>
            : <Button onClick={handleComplete}>סיום והמשך</Button>}
        </div>
      </Card>
    </div>
  )
}
