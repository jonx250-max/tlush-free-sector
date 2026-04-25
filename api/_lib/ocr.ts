/**
 * OCR orchestration — pure logic isolated from HTTP layer for testing.
 *
 * Pipeline:
 *   1. Detect format (PDF / image / HEIC)
 *   2. HEIC → JPEG (server-side conversion via heic-convert)
 *   3. Send image to Google Cloud Vision (DOCUMENT_TEXT_DETECTION)
 *   4. Take raw text → send to Claude Haiku with payslip schema
 *   5. Validate sums (net + deductions ≈ gross within 5%)
 *   6. Return { rawText, structured, confidence, warnings }
 *
 * Environment:
 *   - GOOGLE_VISION_API_KEY (required for prod)
 *   - ANTHROPIC_API_KEY (required for prod)
 */

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
      messages: [{ role: 'user', content: rawText.slice(0, 8000) }],
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

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Claude returned non-JSON response')
  }
}
