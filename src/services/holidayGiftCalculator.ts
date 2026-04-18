// SOURCE: פסיקה + נוהג מקובל — שי לחג ראש השנה ופסח
// אינו זכות חוקית מוחלטת אלא מבוסס נוהג/הסכם קיבוצי. בדיקה: אם בחוזה מצוין → לוודא קבלה.

export interface HolidayGiftInput {
  contractMentionsGift: boolean
  expectedGiftValue: number | null
  payslipGiftEntries: number
  monthsInPeriod: number
  isHolidayMonth: boolean
}

export interface HolidayGiftResult {
  isExpected: boolean
  expectedValue: number
  actualValue: number
  shortfall: number
  note: string
}

export function calculateHolidayGift(input: HolidayGiftInput): HolidayGiftResult {
  if (!input.contractMentionsGift) {
    return {
      isExpected: false, expectedValue: 0, actualValue: input.payslipGiftEntries,
      shortfall: 0, note: 'שי לחג אינו מוזכר בחוזה',
    }
  }
  if (!input.isHolidayMonth) {
    return {
      isExpected: false, expectedValue: 0, actualValue: input.payslipGiftEntries,
      shortfall: 0, note: 'לא בחודש חג',
    }
  }
  const expected = input.expectedGiftValue ?? 0
  const actual = input.payslipGiftEntries
  const shortfall = Math.max(0, expected - actual)
  return {
    isExpected: true, expectedValue: expected, actualValue: actual, shortfall,
    note: shortfall > 0 ? 'שי לחג חסר או חלקי' : 'תקין',
  }
}
