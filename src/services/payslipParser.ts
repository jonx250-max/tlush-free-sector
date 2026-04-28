// ============================================================
// Payslip PDF Parser — מפענח תלוש שכר
// Extracts structured payslip data from Hebrew PDF
// ============================================================

import type { ParsedPayslip, PayslipEntry } from '../types'

// Worker loaded dynamically by the consuming app (see pdfWorkerSetup.ts)

const MAX_PAGES = 12
const PARSE_TIMEOUT_MS = 15_000

// ── Hebrew month lookup ──────────────────────────────────────
const HEBREW_MONTHS: Record<string, number> = {
  ינואר: 1, פברואר: 2, מרץ: 3, אפריל: 4,
  מאי: 5, יוני: 6, יולי: 7, אוגוסט: 8,
  ספטמבר: 9, אוקטובר: 10, נובמבר: 11, דצמבר: 12,
}

// ── Field detection patterns ─────────────────────────────────
// Maps Hebrew field names to payslip fields
const EARNINGS_PATTERNS: Array<{ pattern: RegExp; field: keyof ParsedPayslip }> = [
  { pattern: /שכר\s*(?:יסוד|בסיס|בסיסי|חודשי)/, field: 'basePay' },
  { pattern: /שעות\s*נוספות|ש["\u05F3]נ|שעות\s*125|שעות\s*150/, field: 'overtimePay' },
  { pattern: /(?:גלובלי|גלובאלי|תוספת\s*גלובלית|ש\.נ\.\s*גלובלי)/, field: 'globalOvertimeLine' },
  { pattern: /עמלו?ת|commission/, field: 'commissionPay' },
  { pattern: /בונוס|מענק|פרמיה/, field: 'bonusPay' },
  { pattern: /נסיעו?ת|החזר\s*נסיעו?ת|תחבורה/, field: 'travelAllowance' },
  { pattern: /אר[וו]חו?ת|כלכלה|ארוחה/, field: 'mealAllowance' },
  { pattern: /טלפון|סלולר|תקשורת/, field: 'phoneAllowance' },
  { pattern: /מחלה|דמי\s*מחלה/, field: 'sickPay' },
  { pattern: /חופש[הה]|דמי\s*חופש[הה]/, field: 'vacationPay' },
]

const DEDUCTION_PATTERNS: Array<{ pattern: RegExp; field: keyof ParsedPayslip }> = [
  { pattern: /מס\s*הכנסה|מ["\u05F3]ה/, field: 'incomeTax' },
  { pattern: /ביטוח\s*לאומי|ב["\u05F3]ל/, field: 'nationalInsurance' },
  { pattern: /(?:מס\s*)?בריאות|ב["\u05F3]ב/, field: 'healthInsurance' },
  { pattern: /פנסי[הת]\s*עובד/, field: 'pensionEmployee' },
  { pattern: /(?:קרן\s*)?השתלמות\s*עובד/, field: 'kerenHishtalmutEmployee' },
]

const EMPLOYER_PATTERNS: Array<{ pattern: RegExp; field: keyof ParsedPayslip }> = [
  { pattern: /פנסי[הת]\s*מעסיק|הפרשת?\s*מעסיק\s*(?:ל)?פנסי/, field: 'pensionEmployer' },
  { pattern: /(?:קרן\s*)?השתלמות\s*מעסיק/, field: 'kerenHishtalmutEmployer' },
  { pattern: /פיצויי?ם?\s*(?:מעסיק)?|פיצויי\s*פיטורי[ןם]/, field: 'severanceEmployer' },
]

interface ParsedRow {
  y: number
  cells: Array<{ str: string; x: number; width: number }>
}

type ParseStrategy = 'table' | 'regex' | 'hybrid'

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

export async function parsePayslipPdf(file: File): Promise<ParsedPayslip> {
  const { text, rows } = await withTimeout(
    extractStructured(file),
    PARSE_TIMEOUT_MS,
    'פענוח ה-PDF ארך יותר מדי זמן.',
  )

  validateExtractedText(text)

  const strategy = detectStrategy(rows)
  const entries = strategy === 'table'
    ? parseTable(rows)
    : strategy === 'hybrid'
      ? parseHybrid(rows, text)
      : parseRegex(text)

  const month = extractMonth(text)
  const year = extractYear(text)

  if (!month || !year) {
    throw new Error('לא זוהו חודש ושנה בתלוש השכר.')
  }

  const payslip = buildPayslip(month, year, entries, text)
  return payslip
}

/** Parse from raw text (for testing without actual PDF) */
export function parsePayslipText(text: string): ParsedPayslip {
  const entries = parseRegex(text)
  const month = extractMonth(text) ?? 1
  const year = extractYear(text) ?? 2026
  return buildPayslip(month, year, entries, text)
}

// ══════════════════════════════════════════════════════════════
// PDF EXTRACTION
// ══════════════════════════════════════════════════════════════

async function extractStructured(file: File): Promise<{ text: string; rows: ParsedRow[] }> {
  const { loadPdfjs } = await import('../lib/pdfWorkerSetup')
  const pdfjsLib = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const allLines: string[] = []
  const allRows: ParsedRow[] = []

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`הקובץ כולל יותר מ-${MAX_PAGES} עמודים.`)
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const rowMap = new Map<number, Array<{ str: string; x: number; width: number }>>()

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round(item.transform[5])
        const x = Math.round(item.transform[4])
        const width = 'width' in item ? Math.round(item.width as number) : 0
        if (!rowMap.has(y)) rowMap.set(y, [])
        rowMap.get(y)!.push({ str: item.str.trim(), x, width })
      }
    }

    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)
    for (const y of sortedY) {
      const cells = rowMap.get(y)!
      cells.sort((a, b) => a.x - b.x)
      allRows.push({ y, cells })
      allLines.push(cells.map(c => c.str).join('\t'))
    }
  }

  return { text: allLines.join('\n'), rows: allRows }
}

// ══════════════════════════════════════════════════════════════
// STRATEGY DETECTION
// ══════════════════════════════════════════════════════════════

function detectStrategy(rows: ParsedRow[]): ParseStrategy {
  if (rows.length === 0) return 'regex'
  const tableLike = rows.filter(r => r.cells.length >= 3).length
  const ratio = tableLike / rows.length
  if (ratio > 0.4 && tableLike > 5) return 'table'
  if (ratio > 0.15) return 'hybrid'
  return 'regex'
}

// ══════════════════════════════════════════════════════════════
// TABLE PARSING
// ══════════════════════════════════════════════════════════════

function parseTable(rows: ParsedRow[]): PayslipEntry[] {
  const entries: PayslipEntry[] = []
  for (const row of rows) {
    if (row.cells.length < 2) continue
    const entry = extractEntryFromCells(row.cells)
    if (entry) entries.push(entry)
  }
  return entries
}

function parseHybrid(rows: ParsedRow[], text: string): PayslipEntry[] {
  const tableEntries = parseTable(rows)
  if (tableEntries.length >= 5) return tableEntries
  const regexEntries = parseRegex(text)
  return tableEntries.length >= regexEntries.length ? tableEntries : regexEntries
}

function extractEntryFromCells(cells: Array<{ str: string; x: number; width: number }>): PayslipEntry | null {
  const combined = cells.map(c => c.str).join(' ')
  const amounts = combined.match(/-?[\d,]+\.?\d*/g)
  if (!amounts || amounts.length === 0) return null

  const amountStr = amounts[amounts.length - 1]
  const amount = parseAmount(amountStr)
  if (isNaN(amount) || amount === 0) return null

  // Extract name: everything before the first number
  const nameMatch = combined.match(/^([^\d]+)/)
  const name = nameMatch ? nameMatch[1].trim() : ''
  if (!name || name.length < 2) return null

  // Extract code if present (digits at start or after name)
  const codeMatch = combined.match(/\b(\d{2,4})\b/)
  const code = codeMatch ? codeMatch[1] : ''

  const section = classifySection(name, amount)
  return { code, name, amount: Math.abs(amount), section }
}

// ══════════════════════════════════════════════════════════════
// REGEX PARSING
// ══════════════════════════════════════════════════════════════

function parseRegex(text: string): PayslipEntry[] {
  const entries: PayslipEntry[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 4) continue

    // Find all numbers in the line
    const allNumbers = [...trimmed.matchAll(/([\d,]+\.?\d*)/g)]
      .map(m => ({ raw: m[1], value: parseAmount(m[1]), index: m.index! }))
      .filter(n => n.value > 0)

    if (allNumbers.length === 0) continue

    // The amount is the last number that looks like money (> 10, or has comma)
    // Codes are typically 2-3 digit numbers < 1000
    const amount = allNumbers[allNumbers.length - 1]

    // Extract name: text before the first number
    const nameMatch = trimmed.match(/^([^\d]+)/)
    const name = nameMatch ? nameMatch[1].replace(/[:\s]+$/, '').trim() : ''
    if (!name || name.length < 2) continue

    // Skip summary/header lines
    if (/סה["\u05F3]כ|ברוטו|נטו|לתשלום|תאריך|שם\s*עובד|חברת/.test(name)) continue

    // Code is typically a 2-4 digit number that isn't the amount
    let code = ''
    if (allNumbers.length >= 2) {
      const possibleCode = allNumbers[0]
      if (possibleCode.value < 1000 && possibleCode.value !== amount.value) {
        code = possibleCode.raw
      }
    }

    const section = classifySection(name, amount.value)
    entries.push({ code, name, amount: Math.abs(amount.value), section })
  }

  return entries
}

// ══════════════════════════════════════════════════════════════
// FIELD EXTRACTION
// ══════════════════════════════════════════════════════════════

function extractMonth(text: string): number | null {
  // Try Hebrew month name
  for (const [name, num] of Object.entries(HEBREW_MONTHS)) {
    if (text.includes(name)) return num
  }
  // Try MM/YYYY or MM-YYYY pattern
  const dateMatch = text.match(/\b(0?[1-9]|1[0-2])\s*[/\-.]\s*(20\d{2})\b/)
  if (dateMatch) return parseInt(dateMatch[1])
  return null
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(202[0-9])\b/)
  return match ? parseInt(match[1]) : null
}

function extractOvertimeHours(text: string): number | null {
  // Match "X שעות נוספות" where X is not followed by %
  const match1 = text.match(/(\d+\.?\d*)\s*שעות?\s*נוספות(?!\s*\d)/)
  if (match1 && !text.substring(match1.index!, match1.index! + match1[0].length + 2).includes('%')) {
    return parseFloat(match1[1])
  }
  // Match "שעות נוספות: X" where X is not followed by %
  const match2 = text.match(/שעות\s*נוספות[:\s]+(\d+\.?\d*)(?!\s*%)/)
  if (match2) return parseFloat(match2[1])
  return null
}

// ══════════════════════════════════════════════════════════════
// BUILD PAYSLIP
// ══════════════════════════════════════════════════════════════

function buildPayslip(month: number, year: number, entries: PayslipEntry[], text: string): ParsedPayslip {
  const payslip: ParsedPayslip = {
    month,
    year,
    grossSalary: 0,
    netSalary: 0,
    basePay: null,
    overtimePay: null,
    overtimeHours: extractOvertimeHours(text),
    globalOvertimeLine: null,
    commissionPay: null,
    bonusPay: null,
    travelAllowance: null,
    mealAllowance: null,
    phoneAllowance: null,
    sickPay: null,
    vacationPay: null,
    incomeTax: null,
    nationalInsurance: null,
    healthInsurance: null,
    pensionEmployee: null,
    pensionEmployer: null,
    kerenHishtalmutEmployee: null,
    kerenHishtalmutEmployer: null,
    severanceEmployer: null,
    totalDeductions: null,
    totalEmployerCost: null,
    entries,
  }

  // Map entries to fields
  for (const entry of entries) {
    matchField(entry, EARNINGS_PATTERNS, payslip)
    matchField(entry, DEDUCTION_PATTERNS, payslip)
    matchField(entry, EMPLOYER_PATTERNS, payslip)
  }

  // Extract gross/net from text if not already found
  payslip.grossSalary = extractSummaryAmount(text, /(?:ברוטו|שכר\s*ברוטו|סה["\u05F3]כ\s*ברוטו)[:\s]*([\d,]+\.?\d*)/) ?? sumSection(entries, 'earnings')
  payslip.netSalary = extractSummaryAmount(text, /(?:נטו|שכר\s*נטו|סה["\u05F3]כ\s*נטו|לתשלום)[:\s]*([\d,]+\.?\d*)/) ?? 0
  payslip.totalDeductions = sumSection(entries, 'deductions')

  return payslip
}

function matchField(
  entry: PayslipEntry,
  patterns: Array<{ pattern: RegExp; field: keyof ParsedPayslip }>,
  payslip: ParsedPayslip,
): void {
  for (const { pattern, field } of patterns) {
    if (pattern.test(entry.name)) {
      // Only set if not already set (first match wins) or if new value is larger
      const current = (payslip as Record<string, unknown>)[field]
      if (current === null || current === undefined || (typeof current === 'number' && entry.amount > current)) {
        ;(payslip as Record<string, unknown>)[field] = entry.amount
      }
      return
    }
  }
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function classifySection(name: string, _amount: number): 'earnings' | 'deductions' | 'employer' {
  const deductionKeywords = /מס|ביטוח\s*לאומי|בריאות|ניכוי|פנסי[הת]\s*עובד|השתלמות\s*עובד/
  const employerKeywords = /מעסיק|הפרש[הת]\s*מעסיק|פיצויי?ם/
  if (employerKeywords.test(name)) return 'employer'
  if (deductionKeywords.test(name)) return 'deductions'
  return 'earnings'
}

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ''))
}

function extractSummaryAmount(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern)
  if (!match) return null
  return parseAmount(match[1])
}

function sumSection(entries: PayslipEntry[], section: 'earnings' | 'deductions' | 'employer'): number {
  return entries.filter(e => e.section === section).reduce((s, e) => s + e.amount, 0)
}

function validateExtractedText(text: string): void {
  const meaningful = text.replace(/[\s\d\W]/g, '')
  if (meaningful.length < 30) {
    throw new Error(
      'הקובץ נראה כסרוק ולא דיגיטלי — לא ניתן לחלץ ממנו טקסט. ' +
      'יש לייצא תלוש דיגיטלי מהפורטל של המעסיק.',
    )
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ])
}
