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
