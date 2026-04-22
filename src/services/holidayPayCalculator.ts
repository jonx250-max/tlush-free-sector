// SOURCE: צו הרחבה כללי 1972 — דמי חגים
// עובד שעתי/יומי זכאי ל-9 ימי חג בשנה אחרי 3 חודשי עבודה. שכר חודשי כבר כולל.

import { round2 } from '../lib/numbers'

export interface HolidayPayInput {
  payModel: 'monthly' | 'hourly' | 'shift' | 'commission' | 'global'
  monthsEmployed: number
  hourlyRate: number | null
  hoursPerDay: number
  payslipHolidayPay: number | null
  holidayDaysInMonth: number
}

export interface HolidayPayResult {
  isEligible: boolean
  expectedHolidayPay: number
  actualHolidayPay: number
  shortfall: number
  reason: string
}

export function calculateHolidayPay(input: HolidayPayInput): HolidayPayResult {
  if (input.payModel === 'monthly' || input.payModel === 'global') {
    return {
      isEligible: false, expectedHolidayPay: 0, actualHolidayPay: 0, shortfall: 0,
      reason: 'שכר חודשי כבר כולל ימי חג',
    }
  }
  if (input.monthsEmployed < 3) {
    return {
      isEligible: false, expectedHolidayPay: 0, actualHolidayPay: 0, shortfall: 0,
      reason: 'תקופת המתנה — 3 חודשים ראשונים',
    }
  }
  if (input.holidayDaysInMonth === 0) {
    return {
      isEligible: true, expectedHolidayPay: 0,
      actualHolidayPay: input.payslipHolidayPay ?? 0, shortfall: 0,
      reason: 'אין ימי חג בחודש זה',
    }
  }
  const rate = input.hourlyRate ?? 0
  const expected = round2(input.holidayDaysInMonth * input.hoursPerDay * rate)
  const actual = input.payslipHolidayPay ?? 0
  const shortfall = Math.max(0, round2(expected - actual))
  return {
    isEligible: true, expectedHolidayPay: expected, actualHolidayPay: actual,
    shortfall, reason: shortfall > 0 ? 'דמי חגים בחסר' : 'תקין',
  }
}
