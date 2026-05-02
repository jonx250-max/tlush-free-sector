/**
 * OCR orchestration — pure logic isolated from HTTP layer for testing.
 *
 * Pipeline:
 *   1. Detect format (PDF / image / HEIC)
 *   2. HEIC → JPEG (server-side conversion via heic-convert)
 *   3. Send image to Google Cloud Vision (DOCUMENT_TEXT_DETECTION)
 *   4. Sanitize OCR text (strip prompt-injection pivot phrases) — Stage C C5
 *   5. Send to Claude Haiku with payslip schema
 *   6. Zod-validate the structured response — Stage C C5
 *   7. Validate sums (net + deductions ≈ gross within 5%)
 *   8. Return { rawText, structured, confidence, warnings }
 *
 * Environment:
 *   - GOOGLE_VISION_API_KEY (required for prod)
 *   - ANTHROPIC_API_KEY (required for prod)
 */

import { z } from 'zod'

export interface OcrResult {
  ok: boolean
  rawText: string
  structured: PayslipStructured | null
  confidence: number // 0-1
  warnings: string[]
  error?: string
}

export interface PayslipStructured {
  periodMonth?: number
  periodYear?: number
  grossSalary?: number
  netSalary?: number
  basePay?: number
  overtimePay?: number
  bonusPay?: number
  travelAllowance?: number
  mealAllowance?: number
  pensionEmployee?: number
  pensionEmployer?: number
  kerenHishtalmutEmployee?: number
  kerenHishtalmutEmployer?: number
  incomeTax?: number
  nationalInsurance?: number
  healthInsurance?: number
  totalDeductions?: number
}

export const PAYSLIP_SYSTEM_PROMPT = `אתה מומחה לפענוח תלושי שכר ישראליים.
קבל טקסט גולמי שנקרא ע"י OCR מתלוש שכר וחזיר JSON מובנה.
שמור על מספרים מדויקים. השתמש ב-null לערכים חסרים. אל תמציא נתונים.

החזר אך ורק JSON בפורמט:
{
  "periodMonth": 1-12,
  "periodYear": 2020-2030,
  "grossSalary": number,
  "netSalary": number,
  "basePay": number,
  "overtimePay": number,
  "bonusPay": number,
  "travelAllowance": number,
  "mealAllowance": number,
  "pensionEmployee": number,
  "pensionEmployer": number,
  "kerenHishtalmutEmployee": number,
  "kerenHishtalmutEmployer": number,
  "incomeTax": number,
  "nationalInsurance": number,
  "healthInsurance": number,
  "totalDeductions": number
}`

// Stage C C4 — Magic-byte format detection. Validates that the uploaded
// payload actually is what the client claims (JPEG / PNG / HEIC). Rejects
// PDFs and exotic containers at the door so an attacker cannot smuggle
// e.g. a PDF with embedded JS through the image-only OCR endpoint.
export type OcrImageFormat = 'jpeg' | 'png' | 'heic' | 'unknown'

export function detectImageFormat(base64: string): OcrImageFormat {
  // 64 chars of base64 ≈ 48 raw bytes — enough for every magic we check.
  const head = Buffer.from(base64.slice(0, 64), 'base64')
  if (head.length < 12) return 'unknown'
  if (head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF) return 'jpeg'
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47
    && head[4] === 0x0D && head[5] === 0x0A && head[6] === 0x1A && head[7] === 0x0A) return 'png'
  // ISO BMFF: bytes 4..7 = 'ftyp', brand at bytes 8..11
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11])
    if (['heic', 'heix', 'mif1', 'msf1', 'heis', 'hevc', 'heim', 'heis'].includes(brand)) return 'heic'
  }
  return 'unknown'
}

// Stage C C5 — Prompt-injection scrubber. OCR'd payslip text occasionally
// contains overlay watermarks or instructions that look like prompt
// injection if the OCR mangles them. Strip the most common pivots before
// passing to Claude. Defense-in-depth; the Zod schema below is the
// authoritative gate.
const PIVOT_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above|preceding)/gi,
  /(?:^|\n)\s*system\s*[:>\-]/gim,
  /\b(?:you\s+are|act\s+as)\s+(?:now\s+)?a\s+(?:different|new)/gi,
  /\bDAN\b/g,
  /\bdeveloper\s+mode\b/gi,
  /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/g,
]

// Strip null + C0/C1 control chars (keep \t\n\r). Built from char codes
// so this source file stays plain ASCII (Edit tool corrupts literal
// control chars in regex classes on round-trip).
const CONTROL_CHAR_RANGE = new RegExp(
  '[' +
    String.fromCharCode(0x00) + '-' + String.fromCharCode(0x08) +
    String.fromCharCode(0x0B) + String.fromCharCode(0x0C) +
    String.fromCharCode(0x0E) + '-' + String.fromCharCode(0x1F) +
    String.fromCharCode(0x7F) +
  ']',
  'g',
)

export function sanitizeOcrText(input: string, maxChars = 8000): string {
  let out = input
  for (const re of PIVOT_PATTERNS) out = out.replace(re, '[scrubbed]')
  out = out.replace(CONTROL_CHAR_RANGE, ' ')
  return out.slice(0, maxChars)
}

// Stage C C5 — Zod schema. Strict so unknown keys from a misbehaving model
// are rejected, forcing callers to handle a clean PayslipStructured.
export const PayslipStructuredSchema = z.object({
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodYear: z.number().int().min(2020).max(2030).optional(),
  grossSalary: z.number().nonnegative().optional(),
  netSalary: z.number().nonnegative().optional(),
  basePay: z.number().nonnegative().optional(),
  overtimePay: z.number().nonnegative().optional(),
  bonusPay: z.number().nonnegative().optional(),
  travelAllowance: z.number().nonnegative().optional(),
  mealAllowance: z.number().nonnegative().optional(),
  pensionEmployee: z.number().nonnegative().optional(),
  pensionEmployer: z.number().nonnegative().optional(),
  kerenHishtalmutEmployee: z.number().nonnegative().optional(),
  kerenHishtalmutEmployer: z.number().nonnegative().optional(),
  incomeTax: z.number().nonnegative().optional(),
  nationalInsurance: z.number().nonnegative().optional(),
  healthInsurance: z.number().nonnegative().optional(),
  totalDeductions: z.number().nonnegative().optional(),
}).strict()

export function validateSums(s: PayslipStructured): {
  valid: boolean
  delta?: number
  reason?: string
} {
  if (s.grossSalary == null || s.netSalary == null || s.totalDeductions == null) {
    return { valid: false, reason: 'missing-required-sums' }
  }
  const expected = s.grossSalary - s.totalDeductions
  const delta = Math.abs(expected - s.netSalary)
  const tolerance = s.grossSalary * 0.05
  return {
    valid: delta <= tolerance,
    delta,
    reason: delta > tolerance ? `net-sum-mismatch: ${delta.toFixed(2)} > ${tolerance.toFixed(2)}` : undefined,
  }
}

/**
 * Calls Google Cloud Vision REST API. Returns raw text + per-page confidence.
 * Pure async function — no SDK dependency, no auth state.
 */
export async function callVision(
  imageBase64: string,
  apiKey: string
): Promise<{ text: string; confidence: number }> {
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY missing')

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
            imageContext: { languageHints: ['he', 'en'] },
          },
        ],
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Vision API ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const annotation = data?.responses?.[0]?.fullTextAnnotation
  const text = annotation?.text || ''
  const pages = annotation?.pages || []
  const confidence = pages.length > 0
    ? pages.reduce((s: number, p: { confidence?: number }) => s + (p.confidence || 0), 0) / pages.length
    : 0

  return { text, confidence }
}

/**
 * Calls Anthropic Claude Haiku to structure raw OCR text into payslip JSON.
 */
export async function callClaude(
  rawText: string,
  apiKey: string
): Promise<PayslipStructured> {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: PAYSLIP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: sanitizeOcrText(rawText) }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.content?.[0]?.text || ''
  // Claude may wrap JSON in markdown — strip code fences
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Claude returned non-JSON response')
  }
  // Stage C C5: Zod-validate, reject unknown keys.
  const result = PayslipStructuredSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Claude response failed schema validation: ${result.error.message.slice(0, 200)}`)
  }
  return result.data
}
