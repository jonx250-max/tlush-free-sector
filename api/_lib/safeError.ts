/**
 * Sanitized error responses. Strips internal state (stack traces, Postgres
 * constraint names, raw err.message) before returning to the client.
 *
 * Full errors still go to console.error so Vercel runtime logs capture them
 * for debugging — only the response body is sanitized.
 */

import { randomBytes } from 'node:crypto'
import { redactPII } from './redact.js'

export interface SafeErrorBody {
  error: string
  code: string
  requestId: string
}

const HEBREW_USER_MESSAGES: Record<string, string> = {
  AUDIT_INSERT_FAILED: 'שגיאה זמנית — נסה שוב',
  ANALYSES_INSERT_FAILED: 'לא ניתן ליצור ניתוח כעת',
  OCR_FAILED: 'שגיאה בעיבוד התלוש',
  OTP_SEND_FAILED: 'לא ניתן לשלוח קוד כעת',
  CONFIG_MISSING: 'השירות אינו זמין כעת',
  RATE_LIMITED: 'יותר מדי בקשות, נסה בעוד דקה',
  USER_RATE_LIMITED: 'הגעת למכסה היומית',
  CASE_ID_FORBIDDEN: 'אין לך גישה לתיק זה',
  INVALID_INPUT: 'בקשה לא תקינה',
  PURGE_FAILED: 'שגיאה במחיקת נתונים, נסה שוב',
  INTERNAL: 'שגיאה זמנית',
}

export function safeError(code: string, hebrewOverride?: string): SafeErrorBody {
  return {
    error: hebrewOverride ?? HEBREW_USER_MESSAGES[code] ?? HEBREW_USER_MESSAGES.INTERNAL,
    code,
    requestId: randomBytes(8).toString('hex'),
  }
}

/**
 * Maps known Postgres error codes to a safe public code. Returns null
 * for unknown codes — caller should use a generic 'INTERNAL' fallback.
 */
export function mapPostgresError(pgCode: string | undefined): string | null {
  if (!pgCode) return null
  switch (pgCode) {
    case '23505': return 'DUPLICATE'           // unique violation
    case '23503': return 'INVALID_REFERENCE'    // foreign key violation
    case '23514': return 'VALIDATION_FAILED'    // check constraint
    case '42501': return 'FORBIDDEN'            // insufficient privilege
    case '22023': return 'INVALID_INPUT'        // invalid parameter
    case '40001': return 'CONFLICT'             // serialization failure
    default: return null
  }
}

/**
 * Logs the full error server-side. Vercel runtime captures console.error
 * into queryable logs via `vercel logs` and the dashboard.
 */
export function logServerError(context: string, err: unknown): void {
  const raw = err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { value: String(err) }
  const safe = redactPII(raw)
  console.error(`[server-error] ${context}`, JSON.stringify(safe))
}
