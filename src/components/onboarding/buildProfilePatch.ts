import type { PersonalInfo, UserProfile } from '../../types'
import type { PersonalData, EmploymentData, PayModelData } from './types'

export function buildProfilePatch(
  personal: PersonalData,
  employment: EmploymentData,
  pay: PayModelData,
  userFullName: string | null,
): Partial<UserProfile> {
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
