# React Page Splits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split three oversized React pages (`OnboardingWizard.tsx` 468L, `LandingPage.tsx` 418L, `UploadPage.tsx` 198L) into focused sub-components + tested pure helpers, bringing every file ≤ 300L and every function ≤ 20L.

**Architecture:** Each page becomes a thin orchestrator that composes named sub-components. Imperative logic (profile-shape builders, low-confidence checks, motion helpers) is extracted to pure modules and tested with Vitest. No React-render tests — jsdom / @testing-library/react are not in the project — so testability comes from pure-function extraction, not component tests. External APIs of each page (default exports / route wiring) stay identical.

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind · framer-motion · Vitest 4.1 · React Router 6.

**Constraints from CLAUDE.md / Ruflo:**
- File cap 500L (target ≤ 300L after split).
- Function cap 20L (React return-statement JSX counted).
- TypeScript typed interfaces — no `any`.
- Hebrew RTL labels preserved verbatim.
- `vitest run` + `tsc --noEmit` + `vite build` must stay green at every commit.

**Current baseline (main @ 1a88a0f):**
- 24 test files · 203 tests · all green.
- Existing sub-component folders: `src/components/onboarding/` (empty), `src/components/upload/` (empty), `src/components/landing/` does not exist.

---

## File Structure

### Task 1 — OnboardingWizard

Before:
- `src/pages/OnboardingWizard.tsx` (468L — shell + 4 step components inline + profile-builder)

After:
- `src/pages/OnboardingWizard.tsx` (≤ 120L — shell, step navigation, state, compose sub-components)
- `src/components/onboarding/types.ts` — `PersonalData`, `EmploymentData`, `PayModelData` interfaces
- `src/components/onboarding/buildProfilePatch.ts` — pure: wizard state → `Partial<Profile>` for `updateProfile`
- `src/components/onboarding/buildProfilePatch.test.ts` — covers the conversions (children CSV, military conditional, singleParent, immigrant, parseFloat fallbacks)
- `src/components/onboarding/PersonalInfoStep.tsx` — first-step form (≤ 150L)
- `src/components/onboarding/EmploymentStep.tsx` — second-step form (≤ 80L)
- `src/components/onboarding/PayModelStep.tsx` — third-step form (≤ 80L)
- `src/components/onboarding/ReviewStep.tsx` — summary (≤ 90L)

### Task 2 — LandingPage

Before:
- `src/pages/LandingPage.tsx` (418L — inline nav, hero, 5 sections, footer, ALL_CHECKS const, motion helpers, auth-callback effects)

After:
- `src/pages/LandingPage.tsx` (≤ 100L — auth-callback effects, loading gate, compose sections)
- `src/components/landing/allChecks.ts` — `ALL_CHECKS` data array (icons + copy)
- `src/components/landing/motionPresets.ts` — `fadeUp`, `fadeInView(delay)` pure builders (return props objects; accept `reduced: boolean`)
- `src/components/landing/motionPresets.test.ts` — covers reduced-motion branch returning empty objects
- `src/components/landing/SiteNav.tsx` — fixed glass navbar (≤ 60L)
- `src/components/landing/HeroSection.tsx` — badge + h1 + CTAs (≤ 90L)
- `src/components/landing/HowItWorksSection.tsx` — 3 steps grid (≤ 70L)
- `src/components/landing/FeaturesSection.tsx` — 4-card grid (≤ 60L)
- `src/components/landing/AllChecksSection.tsx` — 6-category grid consuming `ALL_CHECKS` (≤ 70L)
- `src/components/landing/SecuritySection.tsx` — 3-card grid (≤ 70L)
- `src/components/landing/TrustSection.tsx` — badge + blurb (≤ 30L)
- `src/components/landing/MobileStickyCta.tsx` — fixed CTA (≤ 30L)
- `src/components/landing/SiteFooter.tsx` — footer (≤ 30L)

### Task 3 — UploadPage

Before:
- `src/pages/UploadPage.tsx` (198L — shell + 3 step cards inline + profile-builder + `hasLowConfidence`)

After:
- `src/pages/UploadPage.tsx` (≤ 100L — state, step nav, error card, compose step cards)
- `src/components/upload/buildProfileData.ts` — pure: `{ profile, contractTerms } → ProfileData`
- `src/components/upload/buildProfileData.test.ts` — covers profile-first, contract-fallback, default-fallback paths
- `src/components/upload/hasLowConfidence.ts` — pure: returns true if any of 4 key fields `needsVerification`
- `src/components/upload/hasLowConfidence.test.ts` — covers present/absent/each-flag cases
- `src/components/upload/ContractUploadStep.tsx` — step 0 card (≤ 60L)
- `src/components/upload/PayslipUploadStep.tsx` — step 1 card (≤ 60L)
- `src/components/upload/ReviewStep.tsx` — step 2 card (≤ 80L)

---

## Task 1: OnboardingWizard split

**Files:**
- Create: `src/components/onboarding/types.ts`
- Create: `src/components/onboarding/buildProfilePatch.ts`
- Create: `src/components/onboarding/buildProfilePatch.test.ts`
- Create: `src/components/onboarding/PersonalInfoStep.tsx`
- Create: `src/components/onboarding/EmploymentStep.tsx`
- Create: `src/components/onboarding/PayModelStep.tsx`
- Create: `src/components/onboarding/ReviewStep.tsx`
- Modify: `src/pages/OnboardingWizard.tsx`

- [ ] **Step 1.1: Extract shared wizard types**

Create `src/components/onboarding/types.ts`:

```ts
import type { Settlement } from '../../data/settlements'
import type { PayModel } from '../../types'

export interface PersonalData {
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

export interface EmploymentData {
  employerName: string
  employerId: string
  jobTitle: string
  startDate: string
  payModel: PayModel
  workDaysPerWeek: '5' | '6'
}

export interface PayModelData {
  pensionEmployee: string
  pensionEmployer: string
  hasKeren: boolean
  kerenEmployee: string
  kerenEmployer: string
  globalOvertimeHours: string
  globalOvertimeAmount: string
  hourlyRate: string
}

export type Setter<T> = <K extends keyof T>(key: K, value: T[K]) => void
```

- [ ] **Step 1.2: Write buildProfilePatch failing tests**

Create `src/components/onboarding/buildProfilePatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildProfilePatch } from './buildProfilePatch'
import type { PersonalData, EmploymentData, PayModelData } from './types'

function personal(over: Partial<PersonalData> = {}): PersonalData {
  return {
    fullName: 'דני',
    idNumber: '123456789',
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
    ...over,
  }
}

function employment(over: Partial<EmploymentData> = {}): EmploymentData {
  return {
    employerName: 'חברה',
    employerId: '51-123',
    jobTitle: 'מפתח',
    startDate: '2024-01-01',
    payModel: 'monthly',
    workDaysPerWeek: '5',
    ...over,
  }
}

function pay(over: Partial<PayModelData> = {}): PayModelData {
  return {
    pensionEmployee: '6',
    pensionEmployer: '6.5',
    hasKeren: true,
    kerenEmployee: '2.5',
    kerenEmployer: '7.5',
    globalOvertimeHours: '',
    globalOvertimeAmount: '',
    hourlyRate: '',
    ...over,
  }
}

describe('buildProfilePatch', () => {
  it('parses children birth years CSV', () => {
    const p = buildProfilePatch(
      personal({ childrenBirthYears: '2020, 2022 , 2024' }),
      employment(),
      pay(),
      null,
    )
    expect(p.personalInfo.childrenBirthYears).toEqual([2020, 2022, 2024])
  })

  it('returns empty children array when field empty', () => {
    const p = buildProfilePatch(personal(), employment(), pay(), null)
    expect(p.personalInfo.childrenBirthYears).toEqual([])
  })

  it('sets militaryService.served=false when not served', () => {
    const p = buildProfilePatch(personal({ militaryServed: false }), employment(), pay(), null)
    expect(p.personalInfo.militaryService).toEqual({ served: false })
  })

  it('builds militaryService with numeric fields when served', () => {
    const p = buildProfilePatch(
      personal({ militaryServed: true, militaryDischargeYear: '2018', militaryMonths: '36', militaryCombat: true }),
      employment(),
      pay(),
      null,
    )
    expect(p.personalInfo.militaryService).toEqual({
      served: true, dischargeYear: 2018, monthsServed: 36, isCombat: true,
    })
  })

  it('keeps keren rates only when hasKeren', () => {
    const withKeren = buildProfilePatch(personal(), employment(), pay({ hasKeren: true }), null)
    const noKeren = buildProfilePatch(personal(), employment(), pay({ hasKeren: false }), null)
    expect(withKeren.employmentInfo.kerenRateEmployee).toBe(2.5)
    expect(withKeren.employmentInfo.kerenRateEmployer).toBe(7.5)
    expect(noKeren.employmentInfo.kerenRateEmployee).toBeUndefined()
    expect(noKeren.employmentInfo.kerenRateEmployer).toBeUndefined()
  })

  it('falls back to user fullName then null', () => {
    expect(buildProfilePatch(personal({ fullName: '' }), employment(), pay(), 'User').fullName).toBe('User')
    expect(buildProfilePatch(personal({ fullName: '' }), employment(), pay(), null).fullName).toBeNull()
  })

  it('uses default pension rates on NaN', () => {
    const p = buildProfilePatch(personal(), employment(), pay({ pensionEmployee: 'abc', pensionEmployer: 'xyz' }), null)
    expect(p.employmentInfo.pensionRateEmployee).toBe(6)
    expect(p.employmentInfo.pensionRateEmployer).toBe(6.5)
  })

  it('coerces workDaysPerWeek to number', () => {
    const p = buildProfilePatch(personal(), employment({ workDaysPerWeek: '6' }), pay(), null)
    expect(p.employmentInfo.workDaysPerWeek).toBe(6)
  })

  it('passes settlementName when settlement present', () => {
    const p = buildProfilePatch(
      personal({ settlement: { name: 'ירושלים', code: '3000', region: 'center' } as never }),
      employment(), pay(), null,
    )
    expect(p.personalInfo.settlementName).toBe('ירושלים')
  })
})
```

- [ ] **Step 1.3: Run failing test**

Run: `npx vitest run src/components/onboarding/buildProfilePatch.test.ts`
Expected: FAIL with "Cannot find module './buildProfilePatch'".

- [ ] **Step 1.4: Implement buildProfilePatch**

Create `src/components/onboarding/buildProfilePatch.ts`:

```ts
import type { PersonalInfo } from '../../types'
import type { PersonalData, EmploymentData, PayModelData } from './types'

export interface ProfilePatch {
  fullName: string | null
  personalInfo: PersonalInfo
  employmentInfo: {
    employerName: string
    employerId: string
    jobTitle: string
    startDate: string
    payModel: EmploymentData['payModel']
    workDaysPerWeek: 5 | 6
    pensionRateEmployee: number
    pensionRateEmployer: number
    hasKerenHishtalmut: boolean
    kerenRateEmployee?: number
    kerenRateEmployer?: number
  }
}

export function buildProfilePatch(
  personal: PersonalData,
  employment: EmploymentData,
  pay: PayModelData,
  userFullName: string | null,
): ProfilePatch {
  return {
    fullName: personal.fullName || userFullName || null,
    personalInfo: buildPersonalInfo(personal),
    employmentInfo: buildEmploymentInfo(employment, pay),
  }
}

function buildPersonalInfo(p: PersonalData): PersonalInfo {
  return {
    gender: p.gender,
    idNumber: p.idNumber,
    maritalStatus: p.maritalStatus as PersonalInfo['maritalStatus'],
    childrenBirthYears: parseYears(p.childrenBirthYears),
    settlementName: p.settlement?.name,
    academicDegree: p.academicDegree as PersonalInfo['academicDegree'],
    degreeCompletionYear: p.degreeCompletionYear ? parseInt(p.degreeCompletionYear) : undefined,
    militaryService: buildMilitary(p),
    isNewImmigrant: p.isNewImmigrant,
    immigrationDate: p.immigrationDate || undefined,
    isSingleParent: p.isSingleParent,
    reservistDays2026: p.reservistDays ? parseInt(p.reservistDays) : 0,
  }
}

function parseYears(csv: string): number[] {
  if (!csv) return []
  return csv.split(',').map(y => parseInt(y.trim())).filter(Boolean)
}

function buildMilitary(p: PersonalData): PersonalInfo['militaryService'] {
  if (!p.militaryServed) return { served: false }
  return {
    served: true,
    dischargeYear: p.militaryDischargeYear ? parseInt(p.militaryDischargeYear) : undefined,
    monthsServed: p.militaryMonths ? parseInt(p.militaryMonths) : undefined,
    isCombat: p.militaryCombat,
  }
}

function buildEmploymentInfo(e: EmploymentData, pay: PayModelData) {
  return {
    employerName: e.employerName,
    employerId: e.employerId,
    jobTitle: e.jobTitle,
    startDate: e.startDate,
    payModel: e.payModel,
    workDaysPerWeek: parseInt(e.workDaysPerWeek) as 5 | 6,
    pensionRateEmployee: parseFloat(pay.pensionEmployee) || 6,
    pensionRateEmployer: parseFloat(pay.pensionEmployer) || 6.5,
    hasKerenHishtalmut: pay.hasKeren,
    kerenRateEmployee: pay.hasKeren ? (parseFloat(pay.kerenEmployee) || 2.5) : undefined,
    kerenRateEmployer: pay.hasKeren ? (parseFloat(pay.kerenEmployer) || 7.5) : undefined,
  }
}
```

- [ ] **Step 1.5: Run test to verify pass**

Run: `npx vitest run src/components/onboarding/buildProfilePatch.test.ts`
Expected: 9 tests pass.

- [ ] **Step 1.6: Extract PersonalInfoStep**

Create `src/components/onboarding/PersonalInfoStep.tsx` by moving the inline `PersonalInfoStep` function from `src/pages/OnboardingWizard.tsx:209-321` verbatim. Replace inline prop-type with imported types:

```tsx
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { SettlementSelector } from '../ui/SettlementSelector'
import { he } from '../../i18n/he'
import type { PersonalData, Setter } from './types'

export function PersonalInfoStep({ data, onChange }: { data: PersonalData; onChange: Setter<PersonalData> }) {
  return (
    /* copy JSX body unchanged from OnboardingWizard.tsx:213-320 */
  )
}
```

Verify file ≤ 150L.

- [ ] **Step 1.7: Extract EmploymentStep**

Create `src/components/onboarding/EmploymentStep.tsx` by moving the inline `EmploymentStep` function (`OnboardingWizard.tsx:323-367`) verbatim:

```tsx
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import type { PayModel } from '../../types'
import type { EmploymentData, Setter } from './types'

export function EmploymentStep({ data, onChange }: { data: EmploymentData; onChange: Setter<EmploymentData> }) {
  return (
    /* copy JSX body unchanged from OnboardingWizard.tsx:327-366 */
  )
}
```

- [ ] **Step 1.8: Extract PayModelStep**

Create `src/components/onboarding/PayModelStep.tsx` by moving `PayModelStep` (`OnboardingWizard.tsx:369-410`) verbatim:

```tsx
import { Input } from '../ui/Input'
import type { PayModel } from '../../types'
import type { PayModelData, Setter } from './types'

export function PayModelStep({ payModel, data, onChange }: {
  payModel: PayModel
  data: PayModelData
  onChange: Setter<PayModelData>
}) {
  return (
    /* copy JSX body unchanged from OnboardingWizard.tsx:374-409 */
  )
}
```

- [ ] **Step 1.9: Extract ReviewStep**

Create `src/components/onboarding/ReviewStep.tsx` by moving `ReviewStep` (`OnboardingWizard.tsx:412-468`) verbatim:

```tsx
import type { PayModel } from '../../types'
import type { PersonalData, EmploymentData, PayModelData } from './types'

export function ReviewStep({ personal, employment, payModelData }: {
  personal: PersonalData
  employment: EmploymentData
  payModelData: PayModelData
}) {
  /* copy body unchanged from OnboardingWizard.tsx:416-467 */
}
```

- [ ] **Step 1.10: Rewrite OnboardingWizard.tsx as thin shell**

Replace entire `src/pages/OnboardingWizard.tsx` with:

```tsx
import { useState, useCallback } from 'react'
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

function useFieldSetter<T>(setState: React.Dispatch<React.SetStateAction<T>>): Setter<T> {
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
```

- [ ] **Step 1.11: Full verification**

Run these in sequence:
- `npx tsc --noEmit` — expected: no errors
- `npx vitest run` — expected: 213 tests (9 new + 204 prior), all pass
- `npx vite build` — expected: success, bundle report shows new chunks

Confirm `wc -l src/pages/OnboardingWizard.tsx` reports ≤ 120.

- [ ] **Step 1.12: Commit**

```bash
git add src/components/onboarding src/pages/OnboardingWizard.tsx
git commit -m "refactor(onboarding): split wizard into step components + tested profile builder"
```

---

## Task 2: LandingPage split

**Files:**
- Create: `src/components/landing/allChecks.ts`
- Create: `src/components/landing/motionPresets.ts`
- Create: `src/components/landing/motionPresets.test.ts`
- Create: `src/components/landing/SiteNav.tsx`
- Create: `src/components/landing/HeroSection.tsx`
- Create: `src/components/landing/HowItWorksSection.tsx`
- Create: `src/components/landing/FeaturesSection.tsx`
- Create: `src/components/landing/AllChecksSection.tsx`
- Create: `src/components/landing/SecuritySection.tsx`
- Create: `src/components/landing/TrustSection.tsx`
- Create: `src/components/landing/MobileStickyCta.tsx`
- Create: `src/components/landing/SiteFooter.tsx`
- Modify: `src/pages/LandingPage.tsx`

- [ ] **Step 2.1: Extract ALL_CHECKS data**

Create `src/components/landing/allChecks.ts`:

```ts
import { Clock, Coins, Wallet, LogOut, Banknote, Ban, type LucideIcon } from 'lucide-react'
import { he } from '../../i18n/he'

export interface CheckCategory {
  icon: LucideIcon
  title: string
  items: string[]
}

export const ALL_CHECKS: CheckCategory[] = [
  {
    icon: Clock,
    title: he.landing.catOvertime,
    items: [
      'שעות נוספות יומיות (125%/150%)',
      'שעות נוספות שבת/חג (175%/200%)',
      'שעות נוספות במשמרת',
      'שעות נוספות גלובליות (תיקון 24)',
    ],
  },
  { icon: Coins, title: he.landing.catSocial, items: [
    'הפרשות פנסיה מעסיק', 'הפרשות פנסיה עובד',
    'קרן השתלמות עובד ומעסיק', 'רכיב פיצויים בפנסיה',
  ]},
  { icon: Wallet, title: he.landing.catReimbursements, items: [
    'דמי הבראה', 'החזר נסיעות', 'דמי חגים', 'שי לחג',
  ]},
  { icon: LogOut, title: he.landing.catTermination, items: [
    'פיצויי פיטורין + טופס 161', 'הודעה מוקדמת',
    'פדיון חופשה שנתית', 'פדיון ימי מחלה (לפי חוזה)',
  ]},
  { icon: Banknote, title: he.landing.catWage, items: [
    'שכר מינימום', 'משכורת 13', 'תוספת ותק',
    'מילואים — תשלום ימי שירות', 'תוספת ערב/לילה',
  ]},
  { icon: Ban, title: he.landing.catDeductions, items: [
    'ניכויים בלתי חוקיים', 'חוב שכר', 'נקודות זיכוי במס',
    'הטבות אזוריות', 'תאימות תיקון 24 — שכר גלובלי', 'עמלות בבסיס לפנסיה',
  ]},
]
```

- [ ] **Step 2.2: Write motionPresets failing test**

Create `src/components/landing/motionPresets.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fadeUp, fadeInView } from './motionPresets'

describe('motionPresets', () => {
  it('fadeUp returns empty object when reduced', () => {
    expect(fadeUp(true)).toEqual({})
  })

  it('fadeUp returns initial/animate/transition when not reduced', () => {
    const m = fadeUp(false)
    expect(m.initial).toEqual({ opacity: 0, y: 40 })
    expect(m.animate).toEqual({ opacity: 1, y: 0 })
    expect(m.transition?.duration).toBe(0.75)
  })

  it('fadeInView returns empty when reduced regardless of delay', () => {
    expect(fadeInView(true, 0)).toEqual({})
    expect(fadeInView(true, 1.5)).toEqual({})
  })

  it('fadeInView applies provided delay when not reduced', () => {
    const m = fadeInView(false, 0.3)
    expect(m.transition?.delay).toBe(0.3)
    expect(m.whileInView).toEqual({ opacity: 1, y: 0 })
  })

  it('fadeInView defaults delay to 0 when omitted', () => {
    expect(fadeInView(false).transition?.delay).toBe(0)
  })
})
```

- [ ] **Step 2.3: Run failing test**

Run: `npx vitest run src/components/landing/motionPresets.test.ts`
Expected: FAIL with "Cannot find module './motionPresets'".

- [ ] **Step 2.4: Implement motionPresets**

Create `src/components/landing/motionPresets.ts`:

```ts
import type { MotionProps } from 'framer-motion'

export function fadeUp(reduced: boolean): MotionProps {
  if (reduced) return {}
  return {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, ease: 'easeOut' },
  }
}

export function fadeInView(reduced: boolean, delay = 0): MotionProps {
  if (reduced) return {}
  return {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay },
  }
}
```

- [ ] **Step 2.5: Run test to verify pass**

Run: `npx vitest run src/components/landing/motionPresets.test.ts`
Expected: 5 tests pass.

- [ ] **Step 2.6: Extract SiteNav**

Create `src/components/landing/SiteNav.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { he } from '../../i18n/he'

const NAV_LINKS = [
  { label: 'איך זה עובד', href: '#how-it-works' },
  { label: 'יתרונות', href: '#features' },
  { label: 'אבטחה', href: '#security' },
]

export function SiteNav() {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed left-0 right-0 top-0 z-[100] flex h-16 items-center border-b border-white/10 bg-[#000a1f]/70 px-5 backdrop-blur-xl md:h-20 md:px-8"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <span className="text-xl font-black tracking-tight text-white md:text-2xl" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
          {he.common.appName}
        </span>
        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="text-sm font-bold tracking-wide text-white/60 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>
        <Link to="/login" className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#004a99] md:px-8 md:py-3 md:text-sm">
          כניסה מאובטחת
        </Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2.7: Extract HeroSection**

Create `src/components/landing/HeroSection.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { motion, type MotionProps } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { he } from '../../i18n/he'

export function HeroSection({ fadeUpProps }: { fadeUpProps: MotionProps }) {
  return (
    <header className="relative flex items-center overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right_in_oklab,rgba(147,197,253,0.12),rgba(147,197,253,0)_28%),radial-gradient(circle_at_18%_18%_in_oklab,rgba(191,219,254,0.06),rgba(191,219,254,0)_22%)]" />
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute -top-40 right-[-8rem] h-[600px] w-[600px] rounded-full bg-cyan-500/20 blur-[120px]" aria-hidden="true" />
        <div className="absolute bottom-[-10rem] left-[-7rem] h-[600px] w-[600px] rounded-full bg-amber-500/20 blur-[120px]" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000a1f] via-[#000a1f]/50 to-transparent" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-14 md:px-8 md:py-20">
        <motion.div {...fadeUpProps} className="max-w-4xl space-y-8 md:space-y-10">
          <StatusBadge />
          <Headline />
          <CtaRow />
        </motion.div>
      </div>
    </header>
  )
}

function StatusBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
      </span>
      <span className="text-xs font-bold tracking-wider text-white/70">מערכת פעילה ומאובטחת</span>
      <span className="hidden text-xs font-bold tracking-wider text-white/35 md:inline">
        כלי עצמאי לבדיקת תלושי שכר — מגזר פרטי
      </span>
    </div>
  )
}

function Headline() {
  return (
    <div>
      <h1 className="text-[2.8rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[7rem]"
          style={{ fontFamily: "'Noto Serif Hebrew', serif", textShadow: '0 0 30px rgba(252, 211, 77, 0.3)' }}>
        {he.landing.heroTitle.split('?')[0]}
        <br />
        <span className="text-amber-400" style={{ textShadow: '0 0 15px rgba(252, 211, 77, 0.4)' }}>מגיע לך?</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg font-normal leading-8 text-white/90 md:mt-7 md:text-2xl md:leading-relaxed"
         style={{ textShadow: '0 1px 16px rgba(0,0,0,0.55)' }}>
        {he.landing.heroSubtitle}
      </p>
    </div>
  )
}

function CtaRow() {
  return (
    <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:gap-5">
      <Link to="/login" className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-amber-400 px-8 py-4 text-lg font-bold text-[#000a1f] shadow-[0_10px_50px_-10px_rgba(251,191,36,0.5)] transition-all hover:scale-105 sm:w-auto md:px-10 md:py-5 md:text-xl">
        {he.landing.ctaButton}
        <ArrowLeft className="h-6 w-6" aria-hidden="true" />
      </Link>
      <Link to="/login?demo=true" className="w-full cursor-pointer rounded-xl border-2 border-white/20 px-8 py-4 text-center text-lg font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 sm:w-auto md:px-10 md:py-5 md:text-xl">
        {he.common.tryDemo}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2.8: Extract HowItWorksSection**

Create `src/components/landing/HowItWorksSection.tsx`:

```tsx
import { motion } from 'framer-motion'
import { FileText, ShieldCheck, CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'

const STEPS = [
  { step: '1', title: he.landing.step1Title, desc: he.landing.step1Desc, icon: FileText },
  { step: '2', title: he.landing.step2Title, desc: he.landing.step2Desc, icon: ShieldCheck },
  { step: '3', title: he.landing.step3Title, desc: he.landing.step3Desc, icon: CheckCircle },
]

export function HowItWorksSection({ heading, step }: {
  heading: ReturnType<typeof import('framer-motion').motion.h2> extends never ? never : import('framer-motion').MotionProps
  step: (delay?: number) => import('framer-motion').MotionProps
}) {
  return (
    <section id="how-it-works" className="relative bg-[#0c1222] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
          {he.landing.howItWorks}
        </motion.h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map(({ step: s, title, desc, icon: Icon }, i) => (
            <motion.div key={s} {...step(i * 0.15)} className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-amber-400/30 hover:bg-white/[0.07]">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0057b8]/20 text-cyan-400">
                <Icon size={28} />
              </div>
              <div className="mb-2 text-sm font-bold text-amber-400">שלב {s}</div>
              <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

Note: the `heading` prop type noted above is verbose — simplify by importing `MotionProps`:

```tsx
import { motion, type MotionProps } from 'framer-motion'
// …
export function HowItWorksSection({ heading, step }: { heading: MotionProps; step: (delay?: number) => MotionProps }) { … }
```

- [ ] **Step 2.9: Extract FeaturesSection**

Create `src/components/landing/FeaturesSection.tsx`:

```tsx
import { motion, type MotionProps } from 'framer-motion'
import { Shield, FileText, TrendingUp, MapPin } from 'lucide-react'
import { he } from '../../i18n/he'

const FEATURES = [
  { icon: Shield, title: he.landing.featureAmendment24, desc: he.landing.featureAmendment24Desc },
  { icon: TrendingUp, title: he.landing.featureCommissions, desc: he.landing.featureCommissionsDesc },
  { icon: FileText, title: he.landing.featureOvertime, desc: he.landing.featureOvertimeDesc },
  { icon: MapPin, title: he.landing.featureTax, desc: he.landing.featureTaxDesc },
]

export function FeaturesSection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">
          {he.landing.features}
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...card(i * 0.1)} className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/30">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#0057b8]/20">
                <Icon size={24} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2.10: Extract AllChecksSection**

Create `src/components/landing/AllChecksSection.tsx`:

```tsx
import { motion, type MotionProps } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'
import { ALL_CHECKS } from './allChecks'

export function AllChecksSection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="all-checks" className="relative bg-[#070d1d] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div {...heading} className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">{he.landing.allChecksTitle}</h2>
          <p className="mt-3 text-white/60">{he.landing.allChecksSubtitle}</p>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ALL_CHECKS.map((cat, i) => (
            <motion.div key={cat.title} {...card(i * 0.08)} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                  <cat.icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">{cat.title}</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/70">
                {cat.items.map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={14} className="mt-1 flex-shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2.11: Extract SecuritySection**

Create `src/components/landing/SecuritySection.tsx`:

```tsx
import { motion, type MotionProps } from 'framer-motion'
import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react'

const ITEMS = [
  { icon: Lock, title: 'פענוח מקומי', desc: 'קבצי PDF מפוענחים בדפדפן שלך בלבד — לא נשלחים לשום שרת.' },
  { icon: ShieldAlert, title: 'שמירה מצומצמת', desc: 'תוצאות נשמרות זמנית ב-sessionStorage. אין אחסון קבוע של מסמכים.' },
  { icon: ShieldCheck, title: 'אפס המצאות', desc: 'אם חסרים נתונים — המערכת עוצרת. אין ניחושים, אין מסקנות מומצאות.' },
]

export function SecuritySection({ heading, card }: { heading: MotionProps; card: (d?: number) => MotionProps }) {
  return (
    <section id="security" className="relative bg-[#0c1222] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.h2 {...heading} className="mb-16 text-center text-3xl font-bold text-white md:text-4xl">אבטחת מידע</motion.h2>
        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...card(i * 0.12)} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                <Icon size={22} className="text-emerald-400" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2.12: Extract TrustSection, MobileStickyCta, SiteFooter**

Create `src/components/landing/TrustSection.tsx`:

```tsx
import { motion, type MotionProps } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { he } from '../../i18n/he'

export function TrustSection({ anim }: { anim: MotionProps }) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...anim}>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400">
            <CheckCircle size={16} />
            {he.landing.trustTitle}
          </div>
          <p className="mt-4 text-white/50">{he.landing.trustDesc}</p>
        </motion.div>
      </div>
    </section>
  )
}
```

Create `src/components/landing/MobileStickyCta.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { he } from '../../i18n/he'

export function MobileStickyCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#000a1f]/90 p-3 backdrop-blur-xl md:hidden">
      <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-base font-bold text-[#000a1f]">
        {he.landing.ctaButton}
        <ArrowLeft size={18} />
      </Link>
    </div>
  )
}
```

Create `src/components/landing/SiteFooter.tsx`:

```tsx
import { he } from '../../i18n/he'

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c1222] py-10">
      <div className="mx-auto max-w-5xl px-6 text-center text-sm text-white/40">
        <p>© {new Date().getFullYear()} {he.common.appName} — {he.common.appSubtitle}</p>
        <p className="mt-2">המידע באתר הוא לצרכי מידע בלבד ואינו מהווה ייעוץ משפטי.</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2.13: Rewrite LandingPage.tsx as thin shell**

Replace entire `src/pages/LandingPage.tsx` with:

```tsx
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  isAuthCallbackRequest, stripAuthCallbackState,
  shouldShowAuthCallbackLoading, getPostAuthRedirectPath,
} from '../lib/authCallback'
import { fadeUp, fadeInView } from '../components/landing/motionPresets'
import { SiteNav } from '../components/landing/SiteNav'
import { HeroSection } from '../components/landing/HeroSection'
import { HowItWorksSection } from '../components/landing/HowItWorksSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { AllChecksSection } from '../components/landing/AllChecksSection'
import { SecuritySection } from '../components/landing/SecuritySection'
import { TrustSection } from '../components/landing/TrustSection'
import { MobileStickyCta } from '../components/landing/MobileStickyCta'
import { SiteFooter } from '../components/landing/SiteFooter'

export function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasCompletedProfile, isLoading } = useAuth()
  const reduced = !!useReducedMotion()

  const hasUser = Boolean(user)
  const sanitized = stripAuthCallbackState(location.search, location.hash)
  const callbackPending = sanitized.changed || isAuthCallbackRequest(location.search)
  const redirectPath = getPostAuthRedirectPath({ isLoading, isAuthCallbackPending: callbackPending, hasUser, hasCompletedProfile })
  const showLoading = shouldShowAuthCallbackLoading({ isLoading, hasUser, isAuthCallbackPending: callbackPending }) || Boolean(redirectPath)

  useEffect(() => {
    if (redirectPath) navigate(redirectPath, { replace: true })
  }, [navigate, redirectPath])

  useEffect(() => {
    if (isLoading || hasUser || !sanitized.changed) return
    navigate({ pathname: location.pathname, search: sanitized.search, hash: sanitized.hash }, { replace: true })
  }, [sanitized.changed, hasUser, isLoading, location.pathname, navigate, sanitized.hash, sanitized.search])

  if (showLoading) return <AuthLoading />

  const hero = fadeUp(reduced)
  const section = (d = 0) => fadeInView(reduced, d)

  return (
    <div className="min-h-screen bg-[#000a1f]" dir="rtl" style={{ fontFamily: "'Heebo', 'Assistant', sans-serif" }}>
      <SiteNav />
      <HeroSection fadeUpProps={hero} />
      <HowItWorksSection heading={section()} step={section} />
      <FeaturesSection heading={section()} card={section} />
      <AllChecksSection heading={section()} card={section} />
      <SecuritySection heading={section()} card={section} />
      <TrustSection anim={section()} />
      <MobileStickyCta />
      <SiteFooter />
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000a1f]" dir="rtl">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-400" />
        <p className="mt-4 text-lg font-medium text-white/80">מתחבר...</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.14: Verification**

Run:
- `npx tsc --noEmit` — expected: no errors
- `npx vitest run` — expected: 218 tests (5 new + 213 prior), all pass
- `npx vite build` — expected: success
- Manual: `wc -l src/pages/LandingPage.tsx` ≤ 100, each new component file ≤ 100L

- [ ] **Step 2.15: Commit**

```bash
git add src/components/landing src/pages/LandingPage.tsx
git commit -m "refactor(landing): split page into sections + tested motion presets"
```

---

## Task 3: UploadPage split

**Files:**
- Create: `src/components/upload/buildProfileData.ts`
- Create: `src/components/upload/buildProfileData.test.ts`
- Create: `src/components/upload/hasLowConfidence.ts`
- Create: `src/components/upload/hasLowConfidence.test.ts`
- Create: `src/components/upload/ContractUploadStep.tsx`
- Create: `src/components/upload/PayslipUploadStep.tsx`
- Create: `src/components/upload/ReviewStep.tsx`
- Modify: `src/pages/UploadPage.tsx`

- [ ] **Step 3.1: Write hasLowConfidence failing test**

Create `src/components/upload/hasLowConfidence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hasLowConfidence } from './hasLowConfidence'
import type { ContractTerms } from '../../types'

function field(needsVerification: boolean): { value: number; needsVerification: boolean } {
  return { value: 0, needsVerification }
}

function contract(over: Partial<Record<'baseSalary'|'payModel'|'pensionEmployeePct'|'pensionEmployerPct', boolean>> = {}): ContractTerms {
  return {
    baseSalary: field(over.baseSalary ?? false),
    payModel: { value: 'monthly', needsVerification: over.payModel ?? false },
    pensionEmployeePct: field(over.pensionEmployeePct ?? false),
    pensionEmployerPct: field(over.pensionEmployerPct ?? false),
  } as unknown as ContractTerms
}

describe('hasLowConfidence', () => {
  it('returns false when terms are null', () => {
    expect(hasLowConfidence(null)).toBe(false)
  })

  it('returns false when no flags set', () => {
    expect(hasLowConfidence(contract())).toBe(false)
  })

  it('returns true when baseSalary flagged', () => {
    expect(hasLowConfidence(contract({ baseSalary: true }))).toBe(true)
  })

  it('returns true when payModel flagged', () => {
    expect(hasLowConfidence(contract({ payModel: true }))).toBe(true)
  })

  it('returns true when either pension rate flagged', () => {
    expect(hasLowConfidence(contract({ pensionEmployeePct: true }))).toBe(true)
    expect(hasLowConfidence(contract({ pensionEmployerPct: true }))).toBe(true)
  })
})
```

- [ ] **Step 3.2: Run failing test**

Run: `npx vitest run src/components/upload/hasLowConfidence.test.ts`
Expected: FAIL with "Cannot find module './hasLowConfidence'".

- [ ] **Step 3.3: Implement hasLowConfidence**

Create `src/components/upload/hasLowConfidence.ts`:

```ts
import type { ContractTerms } from '../../types'

export function hasLowConfidence(terms: ContractTerms | null): boolean {
  if (!terms) return false
  return [
    terms.baseSalary,
    terms.payModel,
    terms.pensionEmployeePct,
    terms.pensionEmployerPct,
  ].some(f => f.needsVerification)
}
```

- [ ] **Step 3.4: Run test to verify pass**

Run: `npx vitest run src/components/upload/hasLowConfidence.test.ts`
Expected: 5 tests pass.

- [ ] **Step 3.5: Write buildProfileData failing tests**

Create `src/components/upload/buildProfileData.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildProfileData } from './buildProfileData'
import type { ContractTerms, UserProfile } from '../../types'

function contract(): ContractTerms {
  return {
    workDaysPerWeek: { value: 6, needsVerification: false },
    pensionEmployeePct: { value: 7, needsVerification: false },
    pensionEmployerPct: { value: 7.5, needsVerification: false },
    kerenHishtalmutEmployeePct: { value: 2.5, needsVerification: false },
    kerenHishtalmutEmployerPct: { value: 7.5, needsVerification: false },
  } as unknown as ContractTerms
}

function profile(): UserProfile {
  return {
    personalInfo: {
      gender: 'female', childrenBirthYears: [2020], academicDegree: 'ba',
      militaryService: { served: true }, isNewImmigrant: true,
      reservistDays2026: 10, settlementName: 'ירושלים',
    },
    employmentInfo: {
      workDaysPerWeek: 5, pensionRateEmployee: 6, pensionRateEmployer: 6.5,
      hasKerenHishtalmut: true, kerenRateEmployee: 3, kerenRateEmployer: 7.5,
    },
  } as unknown as UserProfile
}

describe('buildProfileData', () => {
  it('prefers profile values when available', () => {
    const d = buildProfileData(profile(), contract())
    expect(d.gender).toBe('female')
    expect(d.workDaysPerWeek).toBe(5)
    expect(d.pensionEmployeePct).toBe(6)
    expect(d.kerenEmployeePct).toBe(3)
  })

  it('falls back to contract when profile.employmentInfo missing', () => {
    const d = buildProfileData({ personalInfo: profile().personalInfo } as UserProfile, contract())
    expect(d.workDaysPerWeek).toBe(6)
    expect(d.pensionEmployeePct).toBe(7)
    expect(d.kerenEmployerPct).toBe(7.5)
  })

  it('falls back to hardcoded defaults when both missing', () => {
    const d = buildProfileData(null, null)
    expect(d.gender).toBe('male')
    expect(d.childrenBirthYears).toEqual([])
    expect(d.workDaysPerWeek).toBe(5)
    expect(d.pensionEmployeePct).toBe(6)
    expect(d.pensionEmployerPct).toBe(6.5)
    expect(d.hasKerenHishtalmut).toBe(false)
  })

  it('infers hasKerenHishtalmut from contract when profile absent', () => {
    const d = buildProfileData(null, contract())
    expect(d.hasKerenHishtalmut).toBe(true)
  })

  it('hasKerenHishtalmut false when contract keren is null', () => {
    const c = { ...contract(), kerenHishtalmutEmployeePct: { value: null, needsVerification: false } } as unknown as ContractTerms
    const d = buildProfileData(null, c)
    expect(d.hasKerenHishtalmut).toBe(false)
  })
})
```

- [ ] **Step 3.6: Run failing test**

Run: `npx vitest run src/components/upload/buildProfileData.test.ts`
Expected: FAIL with "Cannot find module './buildProfileData'".

- [ ] **Step 3.7: Implement buildProfileData**

Create `src/components/upload/buildProfileData.ts`:

```ts
import type { ContractTerms, UserProfile } from '../../types'
import type { ProfileData } from '../../services/diffEngine'

export function buildProfileData(
  profile: UserProfile | null,
  contract: ContractTerms | null,
): ProfileData {
  const pi = profile?.personalInfo
  const ei = profile?.employmentInfo
  return {
    gender: pi?.gender ?? 'male',
    childrenBirthYears: pi?.childrenBirthYears ?? [],
    academicDegree: pi?.academicDegree ?? 'none',
    militaryService: pi?.militaryService ?? { served: false },
    isNewImmigrant: pi?.isNewImmigrant ?? false,
    reservistDays: pi?.reservistDays2026 ?? 0,
    settlement: pi?.settlementName ?? null,
    workDaysPerWeek: ei?.workDaysPerWeek ?? contract?.workDaysPerWeek.value ?? 5,
    pensionEmployeePct: ei?.pensionRateEmployee ?? contract?.pensionEmployeePct.value ?? 6,
    pensionEmployerPct: ei?.pensionRateEmployer ?? contract?.pensionEmployerPct.value ?? 6.5,
    hasKerenHishtalmut: ei?.hasKerenHishtalmut ?? ((contract?.kerenHishtalmutEmployeePct.value ?? null) !== null),
    kerenEmployeePct: ei?.kerenRateEmployee ?? contract?.kerenHishtalmutEmployeePct.value ?? undefined,
    kerenEmployerPct: ei?.kerenRateEmployer ?? contract?.kerenHishtalmutEmployerPct.value ?? undefined,
  }
}
```

- [ ] **Step 3.8: Run test to verify pass**

Run: `npx vitest run src/components/upload/buildProfileData.test.ts`
Expected: 5 tests pass.

- [ ] **Step 3.9: Extract ContractUploadStep**

Create `src/components/upload/ContractUploadStep.tsx`:

```tsx
import { Card, CardTitle } from '../ui/Card'
import { FileDropzone } from '../ui/FileDropzone'
import { Button } from '../ui/Button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { he } from '../../i18n/he'
import type { ContractTerms } from '../../types'

export function ContractUploadStep({ onFileSelect, isParsing, contractTerms, onNext }: {
  onFileSelect: (file: File) => Promise<void> | void
  isParsing: boolean
  contractTerms: ContractTerms | null
  onNext: () => void
}) {
  return (
    <Card>
      <CardTitle>שלב 1: העלאת חוזה העסקה</CardTitle>
      <p className="mb-4 text-sm text-cs-muted">{he.upload.contractDescription}</p>
      <FileDropzone onFileSelect={onFileSelect} label="גרור את חוזה ההעסקה לכאן" description="PDF של חוזה ההעסקה שלך" />
      {isParsing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-cs-primary">
          <Loader2 size={16} className="animate-spin" />
          <span>מפענח את החוזה...</span>
        </div>
      )}
      {contractTerms && (
        <div className="mt-3 rounded-lg border border-cs-success/30 bg-cs-success/5 p-3 text-sm">
          <p className="font-medium text-cs-success">החוזה פוענח בהצלחה</p>
          <p className="text-cs-muted">שכר בסיס: {contractTerms.baseSalary.value.toLocaleString()} ₪ | מודל: {contractTerms.payModel.value}</p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onNext} disabled={!contractTerms || isParsing}>
          הבא <ArrowLeft size={16} />
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3.10: Extract PayslipUploadStep**

Create `src/components/upload/PayslipUploadStep.tsx`:

```tsx
import { Card, CardTitle } from '../ui/Card'
import { FileDropzone } from '../ui/FileDropzone'
import { Button } from '../ui/Button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { he } from '../../i18n/he'
import type { ParsedPayslip } from '../../types'

export function PayslipUploadStep({ onFileSelect, isParsing, payslip, onPrev, onNext }: {
  onFileSelect: (file: File) => Promise<void> | void
  isParsing: boolean
  payslip: ParsedPayslip | null
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <Card>
      <CardTitle>שלב 2: העלאת תלוש שכר</CardTitle>
      <p className="mb-4 text-sm text-cs-muted">{he.upload.payslipDescription}</p>
      <FileDropzone onFileSelect={onFileSelect} label="גרור את תלוש השכר לכאן" description="PDF של תלוש השכר החודשי" />
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
```

- [ ] **Step 3.11: Extract ReviewStep**

Create `src/components/upload/ReviewStep.tsx`:

```tsx
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { FileText, Loader2 } from 'lucide-react'
import type { ContractTerms, ParsedPayslip } from '../../types'
import { hasLowConfidence } from './hasLowConfidence'

export function ReviewStep({ contractFileName, payslipFileName, contractTerms, payslip, isAnalyzing, onPrev, onAnalyze }: {
  contractFileName: string | null
  payslipFileName: string | null
  contractTerms: ContractTerms | null
  payslip: ParsedPayslip | null
  isAnalyzing: boolean
  onPrev: () => void
  onAnalyze: () => void
}) {
  return (
    <Card>
      <CardTitle>שלב 3: סקירה לפני ניתוח</CardTitle>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
          <FileText size={20} className="text-cs-primary" />
          <div>
            <p className="font-medium text-cs-text">חוזה: {contractFileName}</p>
            {contractTerms && (
              <p className="text-xs text-cs-muted">
                שכר: {contractTerms.baseSalary.value.toLocaleString()} ₪ | {contractTerms.workDaysPerWeek.value} ימים |
                פנסיה: {contractTerms.pensionEmployeePct.value}%/{contractTerms.pensionEmployerPct.value}%
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-cs-border p-3">
          <FileText size={20} className="text-cs-secondary" />
          <div>
            <p className="font-medium text-cs-text">תלוש: {payslipFileName}</p>
            {payslip && (
              <p className="text-xs text-cs-muted">
                ברוטו: {payslip.grossSalary.toLocaleString()} ₪ | נטו: {payslip.netSalary.toLocaleString()} ₪ |
                חודש {payslip.month}/{payslip.year}
              </p>
            )}
          </div>
        </div>
        {hasLowConfidence(contractTerms) && (
          <div className="rounded-lg border border-cs-warning/30 bg-cs-warning/5 p-3 text-sm">
            <p className="font-medium text-cs-warning">שים לב: חלק מהשדות פוענחו ברמת ביטחון נמוכה</p>
            <p className="text-cs-muted">מומלץ לבדוק את הערכים בסקירה המפורטת</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={onPrev}>הקודם</Button>
        <Button onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> מנתח...</> : 'התחל ניתוח'}
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3.12: Rewrite UploadPage.tsx as thin shell**

Replace entire `src/pages/UploadPage.tsx` with:

```tsx
import { useState, useCallback, useEffect } from 'react'
import { Stepper } from '../components/ui/Stepper'
import { Card } from '../components/ui/Card'
import { AlertCircle } from 'lucide-react'
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

  const handleAnalyze = useCallback(() => {
    runAnalysis(buildProfileData(profile ?? null, store.contractTerms))
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
        <ContractUploadStep
          onFileSelect={parseContract} isParsing={isParsingContract}
          contractTerms={store.contractTerms} onNext={next}
        />
      )}
      {step === 1 && (
        <PayslipUploadStep
          onFileSelect={parsePayslip} isParsing={isParsingPayslip}
          payslip={store.payslip} onPrev={prev} onNext={next}
        />
      )}
      {step === 2 && (
        <ReviewStep
          contractFileName={store.contractFileName} payslipFileName={store.payslipFileName}
          contractTerms={store.contractTerms} payslip={store.payslip}
          isAnalyzing={isAnalyzing} onPrev={prev} onAnalyze={handleAnalyze}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3.13: Verification**

Run:
- `npx tsc --noEmit` — expected: no errors
- `npx vitest run` — expected: 228 tests (10 new + 218 prior), all pass
- `npx vite build` — expected: success
- Manual: `wc -l src/pages/UploadPage.tsx` ≤ 100

- [ ] **Step 3.14: Commit**

```bash
git add src/components/upload src/pages/UploadPage.tsx
git commit -m "refactor(upload): split page into step cards + tested profile/confidence helpers"
```

---

## Final verification (after all 3 tasks)

- [ ] **Step 4.1: Full repo verification**

Run:
- `npx tsc --noEmit` — no errors
- `npx vitest run` — 228 tests all pass
- `npx vite build` — green, per-route chunks visible

- [ ] **Step 4.2: File-size audit**

Expected:
- `src/pages/OnboardingWizard.tsx` ≤ 120L (was 468L)
- `src/pages/LandingPage.tsx` ≤ 100L (was 418L)
- `src/pages/UploadPage.tsx` ≤ 100L (was 198L)
- All new files ≤ 150L

- [ ] **Step 4.3: Manual smoke (if dev env available)**

`npm run dev`, walk these paths:
1. `/` — landing loads, nav sticky, sections scroll, mobile CTA visible on narrow viewport
2. `/onboarding` (after login/demo) — all 4 steps advance, Review shows data, Submit navigates to `/dashboard`
3. `/upload` — upload contract → payslip → review card → analyze button navigates to `/results`

No console errors. Layout matches pre-refactor screenshots (`dashboard-oklch.png`, `landing-oklch-full.png`, `mobile-landing.png`).

---

## Self-review notes

- **Spec coverage:** each oversized page (Task 13 from audit-report.md backlog items 6+7) has a dedicated task. Pure-fn extraction covers the hook-test gap for the upload flow (item 10 partially — fully covered by Phase 4c).
- **Types consistency:** `PersonalData`, `EmploymentData`, `PayModelData`, `Setter<T>` defined once in `onboarding/types.ts`, imported by all step components + orchestrator. `CheckCategory` is landing-local. `ProfileData` imported from `services/diffEngine`.
- **No placeholders:** every JSX move keeps the original markup verbatim — no "similar to step N" references. Motion helpers and profile builders have complete code.
- **Reduced-motion:** `useReducedMotion` is called once in `LandingPage` and the boolean is passed into `fadeUp(reduced)` / `fadeInView(reduced, delay)` — preserves behavior without JSX-inlined conditionals.
- **Risk:** `motionPresets.ts` returns `{}` when reduced — `<motion.h2 {...{}}>` spreads nothing, framer-motion still renders. Confirmed semantically equivalent to the prior inline branch.
- **Order:** Task 1 → 2 → 3 is safe: Tasks are independent (different component folders, different pages). Any order works; the sequential order lets each verification run cover a smaller surface.
