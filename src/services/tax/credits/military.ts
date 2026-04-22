import type { CreditRule } from './types'

export const military: CreditRule = (input, year) => {
  const svc = input.militaryService
  if (!svc.served || !svc.dischargeYear) return []
  const yearsSince = year - svc.dischargeYear
  if (yearsSince < 0 || yearsSince > 2) return []
  if (svc.monthsServed >= 23 || svc.isCombat) {
    return [{ reason: 'שירות צבאי', points: 2.0 }]
  }
  if (svc.monthsServed >= 12) {
    return [{ reason: 'שירות צבאי', points: 1.0 }]
  }
  return []
}
