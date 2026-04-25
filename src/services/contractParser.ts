// ============================================================
// Contract PDF Parser — מפענח חוזה העסקה
// Extracts employment terms from Hebrew PDF contract
// ============================================================

import type { ContractTerms, ExtractedField, PayModel, CommissionStructure, BonusDefinition } from '../types'

const MAX_PAGES = 30
const PARSE_TIMEOUT_MS = 20_000

// ── Section headers in Hebrew contracts ──────────────────────
const SECTION_PATTERNS = {
  salary: /שכר|משכורת|תגמול|תמורה/,
  hours: /שעות\s*עבודה|ימי\s*עבודה|היקף\s*משרה/,
  overtime: /שעות\s*נוספות|גמול\s*שעות/,
  pension: /פנסי[הת]|ביטוח\s*פנסיוני|הפרשות/,
  keren: /השתלמות|קרן\s*השתלמות/,
  leave: /חופש[הה]|ימי\s*חופש/,
  sick: /מחלה|ימי\s*מחלה/,
  travel: /נסיעו?ת|החזר\s*נסיע/,
  notice: /הודעה\s*מוקדמת/,
  commission: /עמלו?ת|commission/,
  bonus: /בונוס|מענק|פרמי[הה]/,
  severance: /פיצויי?ם?|פיטורי[ןם]/,
}

// ── Amount extraction patterns ───────────────────────────────
const AMOUNT_PATTERN_SRC = '(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:₪|ש["\u05F3]ח|שקלי?ם?\\s*חדשי?ם?)'
const PERCENTAGE_PATTERN = /(\d+(?:\.\d+)?)\s*%/g

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

export async function parseContractPdf(file: File): Promise<ContractTerms> {
  const text = await withTimeout(
    extractText(file),
    PARSE_TIMEOUT_MS,
    'פענוח חוזה ההעסקה ארך יותר מדי זמן.',
  )

  validateText(text)
  return parseContractText(text)
}

/** Parse from raw text (for testing without actual PDF) */
export function parseContractText(text: string): ContractTerms {
  const sections = detectSections(text)
  return {
    ...parseSalaryAndHours(text, sections),
    ...parseOvertimeTerms(text),
    ...parseVariableComp(text, sections),
    ...parseBenefits(text),
    ...parseContractMeta(text),
  }
}

type SalaryTerms = Pick<ContractTerms, 'baseSalary' | 'payModel' | 'hourlyRate' | 'standardHoursPerWeek' | 'workDaysPerWeek'>
function parseSalaryAndHours(text: string, sections: Record<string, string>): SalaryTerms {
  return {
    baseSalary: extractBaseSalary(text, sections.salary),
    payModel: detectPayModel(text),
    hourlyRate: extractHourlyRate(text),
    standardHoursPerWeek: extractWeeklyHours(text),
    workDaysPerWeek: extractWorkDays(text),
  }
}

type OvertimeTerms = Pick<ContractTerms, 'overtimeModel' | 'globalOvertimeHours' | 'globalOvertimeAmount'>
function parseOvertimeTerms(text: string): OvertimeTerms {
  return {
    overtimeModel: detectOvertimeModel(text),
    globalOvertimeHours: extractGlobalOvertimeHours(text),
    globalOvertimeAmount: extractGlobalOvertimeAmount(text),
  }
}

type VariableComp = Pick<ContractTerms, 'commissionStructure' | 'bonuses' | 'travelAllowance' | 'mealAllowance' | 'phoneAllowance'>
function parseVariableComp(text: string, sections: Record<string, string>): VariableComp {
  return {
    commissionStructure: extractCommission(text, sections.commission),
    bonuses: extractBonuses(text, sections.bonus),
    travelAllowance: extractAllowance(text, sections.travel, /נסיעו?ת|תחבורה/),
    mealAllowance: extractAllowance(text, sections.travel, /אר[וו]חו?ת|כלכלה/),
    phoneAllowance: extractAllowance(text, sections.travel, /טלפון|סלולר|תקשורת/),
  }
}

type Benefits = Pick<ContractTerms, 'pensionEmployeePct' | 'pensionEmployerPct' | 'kerenHishtalmutEmployeePct' | 'kerenHishtalmutEmployerPct' | 'severanceEmployerPct' | 'sickDaysPerYear' | 'vacationDaysPerYear' | 'noticePeriodDays'>
function parseBenefits(text: string): Benefits {
  return {
    pensionEmployeePct: extractPensionRate(text, 'employee'),
    pensionEmployerPct: extractPensionRate(text, 'employer'),
    kerenHishtalmutEmployeePct: extractKerenRate(text, 'employee'),
    kerenHishtalmutEmployerPct: extractKerenRate(text, 'employer'),
    severanceEmployerPct: extractSeveranceRate(text),
    sickDaysPerYear: extractDaysPerYear(text, /מחלה/),
    vacationDaysPerYear: extractDaysPerYear(text, /חופש[הה]/),
    noticePeriodDays: extractNoticePeriod(text),
  }
}

type ContractMeta = Pick<ContractTerms, 'effectiveDate' | 'specialClauses'>
function parseContractMeta(text: string): ContractMeta {
  return {
    effectiveDate: extractEffectiveDate(text),
    specialClauses: extractSpecialClauses(text),
  }
}

// ══════════════════════════════════════════════════════════════
// PDF EXTRACTION
// ══════════════════════════════════════════════════════════════

async function extractText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const lines: string[] = []

  if (pdf.numPages > MAX_PAGES) {
    throw new Error('החוזה כולל יותר מ-30 עמודים.')
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const rowMap = new Map<number, string[]>()

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round(item.transform[5])
        if (!rowMap.has(y)) rowMap.set(y, [])
        rowMap.get(y)!.push(item.str.trim())
      }
    }

    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)
    for (const y of sortedY) {
      lines.push(rowMap.get(y)!.join(' '))
    }
  }

  return lines.join('\n')
}

// ══════════════════════════════════════════════════════════════
// SECTION DETECTION
// ══════════════════════════════════════════════════════════════

function detectSections(text: string): Record<string, string> {
  const lines = text.split('\n')
  const sections: Record<string, string> = {}

  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    const startIdx = lines.findIndex(l => pattern.test(l))
    if (startIdx === -1) continue
    sections[name] = lines.slice(startIdx, startIdx + 15).join('\n')
  }

  return sections
}

// ══════════════════════════════════════════════════════════════
// FIELD EXTRACTORS
// ══════════════════════════════════════════════════════════════

function extractBaseSalary(text: string, salarySection?: string): ExtractedField<number> {
  const searchText = salarySection ?? text

  const specific = [
    new RegExp('שכר\\s*(?:בסיס|יסוד|בסיסי|חודשי)(?:\\s*(?:בסיס|יסוד|בסיסי|חודשי))*[:\\s]*' + AMOUNT_PATTERN_SRC),
    new RegExp('משכורת(?:\\s*חודשית)?[:\\s]*' + AMOUNT_PATTERN_SRC),
    new RegExp('(?:סך|סכום)\\s*(?:של?\\s*)?' + AMOUNT_PATTERN_SRC),
  ]

  for (const pattern of specific) {
    const match = searchText.match(pattern)
    if (match) {
      return field(parseAmount(match[1]), 0.9, match[0])
    }
  }

  const amounts = extractAmounts(searchText)
  if (amounts.length > 0) {
    return field(amounts[0].value, 0.6, amounts[0].source)
  }

  return field(0, 0, undefined, true)
}

function detectPayModel(text: string): ExtractedField<PayModel> {
  const patterns: Array<{ pattern: RegExp; model: PayModel; conf: number }> = [
    { pattern: /שכר\s*גלובלי|גלובלי|כולל\s*(?:גמול|תמורת)\s*שעות\s*נוספות/, model: 'global', conf: 0.9 },
    { pattern: /שכר\s*(?:לפי\s*)?שע[הת]|תעריף\s*שעתי/, model: 'hourly', conf: 0.9 },
    { pattern: /עבודה\s*במשמרות|משמרות/, model: 'shift', conf: 0.85 },
    { pattern: /עמלו?ת|commission|אחוז\s*(?:מ)?מכירות/, model: 'commission', conf: 0.85 },
    { pattern: /שכר\s*(?:בסיס|חודשי|יסוד)|משכורת\s*חודשית/, model: 'monthly', conf: 0.8 },
  ]

  for (const { pattern, model, conf } of patterns) {
    const match = text.match(pattern)
    if (match) return field(model, conf, match[0])
  }

  return field('monthly' as PayModel, 0.4, undefined, true)
}

function detectOvertimeModel(text: string): ExtractedField<'standard' | 'global' | 'none'> {
  if (/שכר\s*גלובלי|גלובלי|כולל\s*(?:גמול|תמורת)\s*שעות\s*נוספות/.test(text)) {
    return field('global', 0.9)
  }
  if (/שעות\s*נוספות/.test(text)) {
    return field('standard', 0.7)
  }
  return field('standard', 0.4, undefined, true)
}

function extractHourlyRate(text: string): ExtractedField<number | null> {
  const match = text.match(new RegExp('(?:תעריף|שכר)\\s*(?:לשע[הת]|שעתי)[:\\s]*' + AMOUNT_PATTERN_SRC))
  if (match) return field(parseAmount(match[1]), 0.9, match[0])
  return field(null, 0)
}

function extractWeeklyHours(text: string): ExtractedField<number> {
  const match = text.match(/(\d+(?:\.\d+)?)\s*שעות\s*(?:עבודה\s*)?(?:ב)?שבוע/)
  if (match) return field(parseFloat(match[1]), 0.85, match[0])
  return field(42, 0.5, undefined, true)
}

function extractWorkDays(text: string): ExtractedField<5 | 6> {
  const match = text.match(/(5|6)\s*ימי?ם?\s*(?:עבודה\s*)?(?:ב)?שבוע/)
  if (match) return field(parseInt(match[1]) as 5 | 6, 0.9, match[0])
  return field(5, 0.5, undefined, true)
}

function extractGlobalOvertimeHours(text: string): ExtractedField<number | null> {
  const match = text.match(/(\d+)\s*שעות?\s*נוספות\s*(?:גלובלי|כלולות|בחודש)/)
  if (match) return field(parseInt(match[1]), 0.85, match[0])
  const match2 = text.match(/גלובלי[:\s]*(\d+)\s*שעות/)
  if (match2) return field(parseInt(match2[1]), 0.8, match2[0])
  return field(null, 0)
}

function extractGlobalOvertimeAmount(text: string): ExtractedField<number | null> {
  const match = text.match(new RegExp('(?:תוספת|גמול)\\s*(?:שעות\\s*נוספות\\s*)?גלובלי[ת]?[:\\s]*' + AMOUNT_PATTERN_SRC))
  if (match) return field(parseAmount(match[1]), 0.85, match[0])
  return field(null, 0)
}

function extractCommission(text: string, section?: string): ExtractedField<CommissionStructure | null> {
  const searchText = section ?? text
  if (!/עמלו?ת|commission/.test(searchText)) {
    return field(null, 0)
  }

  const pctMatch = searchText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:מ(?:ה)?מכירות|עמלה|commission)/)
  if (pctMatch) {
    return field({
      type: 'percentage',
      rate: parseFloat(pctMatch[1]),
      tiers: null,
      isIncludedInBase: /כולל|חלק\s*מ(?:ה)?שכר\s*(?:ה)?קובע/.test(searchText),
    }, 0.8, pctMatch[0])
  }

  return field({
    type: 'percentage',
    rate: null,
    tiers: null,
    isIncludedInBase: false,
  }, 0.4, undefined, true)
}

function extractBonuses(text: string, section?: string): ExtractedField<BonusDefinition[]> {
  const searchText = section ?? text
  const bonuses: BonusDefinition[] = []

  const match = searchText.match(new RegExp('(?:בונוס|מענק|פרמי[הה])[:\\s]*' + AMOUNT_PATTERN_SRC))
  if (match) {
    const freq = /שנתי|annual/.test(searchText) ? 'annual' as const
      : /רבעוני|quarterly/.test(searchText) ? 'quarterly' as const
        : 'monthly' as const
    bonuses.push({ name: 'בונוס', amount: parseAmount(match[1]), frequency: freq })
  }

  return field(bonuses, bonuses.length > 0 ? 0.7 : 0)
}

function extractAllowance(text: string, section: string | undefined, keyword: RegExp): ExtractedField<number | null> {
  const searchText = section ?? text
  if (!keyword.test(searchText)) return field(null, 0)

  const lines = searchText.split('\n').filter(l => keyword.test(l))
  for (const line of lines) {
    const amounts = extractAmounts(line)
    if (amounts.length > 0) {
      return field(amounts[0].value, 0.75, amounts[0].source)
    }
  }
  return field(null, 0.3, undefined, true)
}

function extractPensionRate(text: string, side: 'employee' | 'employer'): ExtractedField<number> {
  const sidePattern = side === 'employee'
    ? /עובד[:\s]*(\d+(?:\.\d+)?)\s*%/
    : /מעסיק[:\s]*(\d+(?:\.\d+)?)\s*%/

  const pensionLines = text.split('\n').filter(l => /פנסי[הת]|ביטוח\s*פנסיוני/.test(l))
  for (const line of pensionLines) {
    const match = line.match(sidePattern)
    if (match) return field(parseFloat(match[1]), 0.9, match[0])
  }

  // Try generic percentage near pension section
  const pensionSection = text.split('\n')
    .reduce((acc, l, i, arr) => {
      if (/פנסי[הת]/.test(l)) return arr.slice(i, i + 5).join('\n')
      return acc
    }, '')

  if (pensionSection) {
    const pcts = [...pensionSection.matchAll(PERCENTAGE_PATTERN)].map(m => parseFloat(m[1]))
    if (pcts.length >= 2) {
      const sorted = pcts.sort((a, b) => a - b)
      return field(
        side === 'employee' ? sorted[0] : sorted[sorted.length - 1],
        0.6,
        undefined,
        true,
      )
    }
  }

  return field(side === 'employee' ? 6 : 6.5, 0.3, undefined, true)
}

function extractKerenRate(text: string, side: 'employee' | 'employer'): ExtractedField<number | null> {
  if (!/השתלמות/.test(text)) return field(null, 0)

  const sidePattern = side === 'employee'
    ? /עובד[:\s]*(\d+(?:\.\d+)?)\s*%/
    : /מעסיק[:\s]*(\d+(?:\.\d+)?)\s*%/

  const kerenLines = text.split('\n').filter(l => /השתלמות/.test(l))
  for (const line of kerenLines) {
    const match = line.match(sidePattern)
    if (match) return field(parseFloat(match[1]), 0.9, match[0])
  }

  return field(side === 'employee' ? 2.5 : 7.5, 0.4, undefined, true)
}

function extractSeveranceRate(text: string): ExtractedField<number> {
  const match = text.match(/פיצויי?ם?[:\s]*(\d+(?:\.\d+)?)\s*%/)
  if (match) return field(parseFloat(match[1]), 0.85, match[0])
  return field(8.33, 0.3, undefined, true)
}

function extractDaysPerYear(text: string, keyword: RegExp): ExtractedField<number> {
  const lines = text.split('\n').filter(l => keyword.test(l))
  for (const line of lines) {
    const match = line.match(/(\d+)\s*ימי?ם?/)
    if (match) return field(parseInt(match[1]), 0.8, match[0])
  }
  return field(keyword.source.includes('מחלה') ? 18 : 12, 0.3, undefined, true)
}

function extractNoticePeriod(text: string): ExtractedField<number> {
  const lines = text.split('\n').filter(l => /הודעה\s*מוקדמת/.test(l))
  for (const line of lines) {
    const dayMatch = line.match(/(\d+)\s*ימי?ם?/)
    if (dayMatch) return field(parseInt(dayMatch[1]), 0.85, dayMatch[0])
    const monthMatch = line.match(/(\d+)\s*חודשי?ם?/)
    if (monthMatch) return field(parseInt(monthMatch[1]) * 30, 0.85, monthMatch[0])
  }
  return field(30, 0.3, undefined, true)
}

function extractEffectiveDate(text: string): ExtractedField<string> {
  const match = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})/)
  if (match) {
    return field(
      `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
      0.7,
      match[0],
    )
  }
  return field('', 0, undefined, true)
}

function extractSpecialClauses(text: string): string[] {
  const clauses: string[] = []
  const indicators = [
    { pattern: /אי\s*תחרות/, label: 'אי תחרות' },
    { pattern: /סודיות/, label: 'סודיות' },
    { pattern: /קניין\s*רוחני/, label: 'קניין רוחני' },
    { pattern: /בלעדיות/, label: 'בלעדיות' },
  ]
  for (const { pattern, label } of indicators) {
    if (pattern.test(text)) clauses.push(label)
  }
  return clauses
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function field<T>(value: T, confidence: number, sourceText?: string, needsVerification?: boolean): ExtractedField<T> {
  return {
    value,
    confidence,
    sourceText,
    needsVerification: needsVerification ?? confidence < 0.7,
  }
}

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ''))
}

function extractAmounts(text: string): Array<{ value: number; source: string }> {
  const results: Array<{ value: number; source: string }> = []
  const regex = new RegExp(AMOUNT_PATTERN_SRC, 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const val = parseAmount(match[1])
    if (val > 0) results.push({ value: val, source: match[0] })
  }
  return results
}

function validateText(text: string): void {
  const meaningful = text.replace(/[\s\d\W]/g, '')
  if (meaningful.length < 50) {
    throw new Error(
      'הקובץ נראה כסרוק ולא דיגיטלי — לא ניתן לחלץ ממנו טקסט. ' +
      'יש להעלות חוזה בפורמט PDF דיגיטלי.',
    )
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ])
}
