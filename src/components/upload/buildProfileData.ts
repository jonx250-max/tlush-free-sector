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
