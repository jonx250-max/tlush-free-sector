// Validates special legal leaves: bereavement, election, jury duty, wedding.
// SOURCE: חוק חופשה שנתית, ח"ב לביטוח לאומי, חוק הבחירות

export type SpecialLeaveType =
  | 'bereavement_immediate' // 7 ימי שבעה — בן/בת זוג, הורה, ילד, אח/אחות
  | 'bereavement_extended'  // 1 יום — חמ/חמות, נכד/נכדה
  | 'wedding_self'          // 1 יום (לפי הסכמים קיבוציים)
  | 'wedding_child'         // 1 יום
  | 'election'              // יום הבחירות הכללי = יום שבתון
  | 'jury_duty'             // מילואים שיפוטיים — מטעם המעסיק
  | 'sick_relative'         // 8 ימים בשנה לטיפול בקרוב חולה

export interface SpecialLeaveEvent {
  type: SpecialLeaveType
  eventDate: string // ISO yyyy-mm-dd
  daysTaken: number
  paid: boolean
}

export interface SpecialLeavesResult {
  validated: SpecialLeaveEvent[]
  shortfalls: { event: SpecialLeaveEvent; expectedDays: number; missingDays: number }[]
  unpaid: SpecialLeaveEvent[]
}

const ENTITLEMENT_DAYS: Record<SpecialLeaveType, number> = {
  bereavement_immediate: 7,
  bereavement_extended: 1,
  wedding_self: 1,
  wedding_child: 1,
  election: 1,
  jury_duty: -1, // duration of duty, no fixed cap
  sick_relative: 8, // per year
}

export function validateSpecialLeaves(events: SpecialLeaveEvent[]): SpecialLeavesResult {
  const validated: SpecialLeaveEvent[] = []
  const shortfalls: { event: SpecialLeaveEvent; expectedDays: number; missingDays: number }[] = []
  const unpaid: SpecialLeaveEvent[] = []

  for (const e of events) {
    const expected = ENTITLEMENT_DAYS[e.type]
    if (expected > 0 && e.daysTaken < expected) {
      shortfalls.push({ event: e, expectedDays: expected, missingDays: expected - e.daysTaken })
    } else {
      validated.push(e)
    }
    if (!e.paid) unpaid.push(e)
  }

  return { validated, shortfalls, unpaid }
}

export function isElectionDay(isoDate: string): boolean {
  // Israeli general election dates 2022-2026 (placeholder; refresh from gov.il in P7)
  const ELECTION_DATES = ['2022-11-01', '2025-10-28']
  return ELECTION_DATES.includes(isoDate)
}
