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
 * Returns: OcrResult { ok, rawText, structured, confidence, warnings }
 */

import { callVision, callClaude, validateSums, type OcrResult } from './_lib/ocr'
import { isGeoAllowed } from './_lib/geoCheck'
import { rateLimit, extractClientIp } from './_lib/rateLimit'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const geo = isGeoAllowed(req.headers, req.query)
  if (!geo.allowed) {
    return res.status(403).json({ error: 'Service available in Israel only', code: 'GEO_BLOCKED' })
  }

  const ip = extractClientIp(req.headers)
  const rl = rateLimit({ key: `ocr:${ip}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return res.status(429).json({ error: 'יותר מדי בקשות OCR', code: 'RATE_LIMITED', resetAt: rl.resetAt })
  }

  const visionKey = process.env.GOOGLE_VISION_API_KEY
  const claudeKey = process.env.ANTHROPIC_API_KEY

  if (!visionKey || !claudeKey) {
    return res.status(503).json({
      error: 'OCR service not configured',
      code: 'OCR_DISABLED',
      hint: 'Set GOOGLE_VISION_API_KEY and ANTHROPIC_API_KEY in env',
    })
  }

  let imageBase64 = req.body?.imageBase64
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  const format = req.body?.format
  if (format === 'heic') {
    try {
      const heicConvert = (await import('heic-convert')).default
      const buffer = Buffer.from(imageBase64, 'base64')
      const jpeg = await heicConvert({
        buffer: new Uint8Array(buffer),
        format: 'JPEG',
        quality: 0.9,
      })
      imageBase64 = Buffer.from(jpeg).toString('base64')
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
    const vision = await callVision(imageBase64, visionKey)
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
    return res.status(200).json(result)
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    return res.status(500).json(result)
  }
}
