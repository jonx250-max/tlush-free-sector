/**
 * POST /api/ocr
 *
 * Accepts an image (base64) or PDF page, returns structured payslip
 * data. Used as fallback when client-side payslipParser regex fails.
 *
 * Body: {
 *   imageBase64: string  // base64 of image (PNG/JPEG/HEIC)
 *   format?: 'image' | 'heic'  // optional hint
 * }
 *
 * Beta-mode features:
 *   - OCR_MOCK_MODE=true → returns canned structured payslip without calling APIs
 *   - File-hash cache (Supabase ocr_cache table) → repeat uploads return cached result for $0
 *   - OCR_DAILY_LIMIT cap → blocks real API calls beyond N per UTC day
 */

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { callVision, callClaude, validateSums, type OcrResult } from './_lib/ocr.js'
import { isGeoAllowed } from './_lib/geoCheck.js'
import { rateLimit, extractClientIp } from './_lib/rateLimit.js'
import { safeError, logServerError } from './_lib/safeError.js'

interface VercelRequest {
  method: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body: { imageBase64?: string; format?: string }
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: unknown) => void
}

const MOCK_RESULT: OcrResult = {
  ok: true,
  rawText:
    'תלוש שכר ינואר 2026\nשם: דוגמה לבדיקה\nשכר ברוטו: 12,500 ש"ח\nניכויים: 2,800 ש"ח\nשכר נטו: 9,700 ש"ח',
  structured: {
    employeeName: 'דוגמה לבדיקה',
    period: '2026-01',
    grossPay: 12500,
    netPay: 9700,
    deductions: { tax: 1800, nationalInsurance: 600, healthInsurance: 200, pensionEmployee: 200 },
    additions: { baseSalary: 12500 },
    employerContributions: { pensionEmployer: 750, severance: 1050 },
    notes: ['MOCK MODE — לא נשלח ל-Anthropic/Vision'],
  } as Record<string, unknown>,
  confidence: 0.95,
  warnings: ['mock-mode-active'],
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const ip = extractClientIp(req.headers)
  const rl = await rateLimit({ key: `ocr:${ip}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return res.status(429).json({ error: 'יותר מדי בקשות OCR', code: 'RATE_LIMITED', resetAt: rl.resetAt })
  }

  const imageBase64 = req.body?.imageBase64
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  // ~8MB raw → ~11.2MB base64. Reject larger payloads to prevent memory exhaustion.
  const MAX_IMAGE_BASE64_BYTES = 11 * 1024 * 1024
  if (imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
    return res.status(413).json({
      error: 'תמונה גדולה מדי, מקסימום 8MB',
      code: 'IMAGE_TOO_LARGE',
      maxBytes: MAX_IMAGE_BASE64_BYTES,
    })
  }

  const fileHash = createHash('sha256').update(imageBase64).digest('hex')
  const mockMode = process.env.OCR_MOCK_MODE === 'true'

  // Cache + quota only available with Supabase service role
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null

  if (admin) {
    const { data: cached } = await admin
      .from('ocr_cache')
      .select('result')
      .eq('file_hash', fileHash)
      .maybeSingle()
    if (cached?.result) {
      return res.status(200).json({ ...(cached.result as Record<string, unknown>), cached: true })
    }
  }

  if (mockMode) {
    if (admin) {
      await admin.from('ocr_cache').insert({
        file_hash: fileHash,
        result: MOCK_RESULT,
        was_real_call: false,
      })
    }
    return res.status(200).json({ ...MOCK_RESULT, mock: true })
  }

  const visionKey = process.env.GOOGLE_VISION_API_KEY
  const claudeKey = process.env.ANTHROPIC_API_KEY

  if (!visionKey || !claudeKey) {
    return res.status(503).json({
      error: 'OCR service not configured',
      code: 'OCR_DISABLED',
      hint: 'Set GOOGLE_VISION_API_KEY and ANTHROPIC_API_KEY (or OCR_MOCK_MODE=true) in env',
    })
  }

  // Daily quota gate — real API calls only
  if (admin) {
    const dailyLimit = Number.parseInt(process.env.OCR_DAILY_LIMIT ?? '20', 10)
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await admin
      .from('ocr_cache')
      .select('*', { count: 'exact', head: true })
      .eq('was_real_call', true)
      .gte('created_at', today)
    if ((count ?? 0) >= dailyLimit) {
      return res.status(429).json({
        error: 'מכסת OCR יומית הגיעה',
        code: 'QUOTA_REACHED',
        limit: dailyLimit,
        hint: 'נסה שוב מחר או הפעל OCR_MOCK_MODE לבדיקות',
      })
    }
  }

  let processedImage = imageBase64
  if (req.body?.format === 'heic') {
    try {
      const heicConvert = (await import('heic-convert')).default
      const buffer = Buffer.from(imageBase64, 'base64')
      const jpeg = await heicConvert({
        buffer: new Uint8Array(buffer),
        format: 'JPEG',
        quality: 0.9,
      })
      processedImage = Buffer.from(jpeg).toString('base64')
    } catch (err) {
      return res.status(500).json({
        error: 'HEIC conversion failed',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const result: OcrResult = {
    ok: false, rawText: '', structured: null, confidence: 0, warnings: [],
  }

  try {
    const vision = await callVision(processedImage, visionKey)
    result.rawText = vision.text
    result.confidence = vision.confidence

    if (!vision.text) {
      result.warnings.push('vision-returned-empty-text')
      return res.status(200).json(result)
    }

    const structured = await callClaude(vision.text, claudeKey)
    result.structured = structured

    const validation = validateSums(structured)
    if (!validation.valid) {
      result.warnings.push(`sum-validation: ${validation.reason}`)
    }

    result.ok = true

    if (admin) {
      await admin.from('ocr_cache').insert({
        file_hash: fileHash,
        result,
        was_real_call: true,
      })
    }

    return res.status(200).json(result)
  } catch (err) {
    logServerError('ocr-pipeline', err)
    return res.status(500).json(safeError('OCR_FAILED'))
  }
}
