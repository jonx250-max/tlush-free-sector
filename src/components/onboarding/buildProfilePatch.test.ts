import { describe, it, expect } from 'vitest'
import { buildProfilePatch } from './buildProfilePatch'
import type { PersonalData, EmploymentData, PayModelData } from './types'
import type { Settlement } from '../../data/settlements'

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

function settlement(name: string): Settlement {
  return { name, type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 }
}

describe('buildProfilePatch', () => {
  it('parses children birth years CSV', () => {
    const p = buildProfilePatch(
      personal({ childrenBirthYears: '2020, 2022 , 2024' }),
      employment(),
      pay(),
      null,
    )
    expect(p.personalInfo?.childrenBirthYears).toEqual([2020, 2022, 2024])
  })

  it('returns empty children array when field empty', () => {
    const p = buildProfilePatch(personal(), employment(), pay(), null)
    expect(p.personalInfo?.childrenBirthYears).toEqual([])
  })

  it('sets militaryService.served=false when not served', () => {
    const p = buildProfilePatch(personal({ militaryServed: false }), employment(), pay(), null)
    expect(p.personalInfo?.militaryService).toEqual({ served: false })
  })

  it('builds militaryService with numeric fields when served', () => {
    const p = buildProfilePatch(
      personal({ militaryServed: true, militaryDischargeYear: '2018', militaryMonths: '36', militaryCombat: true }),
      employment(),
      pay(),
      null,
    )
    expect(p.personalInfo?.militaryService).toEqual({
      served: true, dischargeYear: 2018, monthsServed: 36, isCombat: true,
    })
  })

  it('keeps keren rates only when hasKeren', () => {
    const withKeren = buildProfilePatch(personal(), employment(), pay({ hasKeren: true }), null)
    const noKeren = buildProfilePatch(personal(), employment(), pay({ hasKeren: false }), null)
    expect(withKeren.employmentInfo?.kerenRateEmployee).toBe(2.5)
    expect(withKeren.employmentInfo?.kerenRateEmployer).toBe(7.5)
    expect(noKeren.employmentInfo?.kerenRateEmployee).toBeUndefined()
    expect(noKeren.employmentInfo?.kerenRateEmployer).toBeUndefined()
  })

  it('falls back to user fullName then null', () => {
    expect(buildProfilePatch(personal({ fullName: '' }), employment(), pay(), 'User').fullName).toBe('User')
    expect(buildProfilePatch(personal({ fullName: '' }), employment(), pay(), null).fullName).toBeNull()
  })

  it('uses default pension rates on NaN', () => {
    const p = buildProfilePatch(personal(), employment(), pay({ pensionEmployee: 'abc', pensionEmployer: 'xyz' }), null)
    expect(p.employmentInfo?.pensionRateEmployee).toBe(6)
    expect(p.employmentInfo?.pensionRateEmployer).toBe(6.5)
  })

  it('coerces workDaysPerWeek to number', () => {
    const p = buildProfilePatch(personal(), employment({ workDaysPerWeek: '6' }), pay(), null)
    expect(p.employmentInfo?.workDaysPerWeek).toBe(6)
  })

  it('passes settlementName when settlement present', () => {
    const p = buildProfilePatch(
      personal({ settlement: settlement('ירושלים') }),
      employment(), pay(), null,
    )
    expect(p.personalInfo?.settlementName).toBe('ירושלים')
  })
})
