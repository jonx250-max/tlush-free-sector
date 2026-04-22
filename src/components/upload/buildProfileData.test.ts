import { describe, it, expect } from 'vitest'
import { buildProfileData } from './buildProfileData'
import type { ContractTerms, UserProfile } from '../../types'

function contract(): ContractTerms {
  return {
    workDaysPerWeek: { value: 6, confidence: 1, needsVerification: false },
    pensionEmployeePct: { value: 7, confidence: 1, needsVerification: false },
    pensionEmployerPct: { value: 7.5, confidence: 1, needsVerification: false },
    kerenHishtalmutEmployeePct: { value: 2.5, confidence: 1, needsVerification: false },
    kerenHishtalmutEmployerPct: { value: 7.5, confidence: 1, needsVerification: false },
  } as unknown as ContractTerms
}

function profile(): UserProfile {
  return {
    personalInfo: {
      gender: 'female', childrenBirthYears: [2020], academicDegree: 'bachelor',
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
    const p = { personalInfo: profile().personalInfo } as UserProfile
    const d = buildProfileData(p, contract())
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
    const c = { ...contract(), kerenHishtalmutEmployeePct: { value: null, confidence: 1, needsVerification: false } } as unknown as ContractTerms
    const d = buildProfileData(null, c)
    expect(d.hasKerenHishtalmut).toBe(false)
  })
})
