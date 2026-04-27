/**
 * Sanitized error responses. Strips internal state (stack traces, Postgres
 * constraint names, raw err.message) before returning to the client.
 *
 * Full errors still go to console.error so Vercel runtime logs capture them
 * for debugging — only the response body is sanitized.
 *
 * Boundary policy: callers must NEVER map raw Postgres SQLSTATE codes into
 * distinct public error codes. An attacker probing constraint failures
 * (e.g. forcing 23505 to enumerate columns) should see only the generic
 * code passed to `safeError()`. Map pg-codes to HTTP categories at most
 * (e.g. 42501 → 403) inside the handler, never to bespoke public codes
 * that mirror DB structure.
 */

import { randomBytes } from 'node:crypto'

export interface SafeErrorBody {
  error: string
  code: string
  requestId: string
}

const HEBREW_USER_MESSAGES: Record<string, string> = {
  AUDIT_INSERT_FAILED: 'שגיאה זמנית — נסה שוב',
  ANALYSES_INSERT_FAILED: 'לא ניתן ליצור ניתוח כעת',
  OCR_FAILED: 'שגיאה בעיבוד התלוש',
  CONFIG_MISSING: 'השירות אינו זמין כעת',
  RATE_LIMITED: 'יותר מדי בקשות, נסה בעוד דקה',
  CASE_ID_FORBIDDEN: 'אין לך גישה לתיק זה',
  INVALID_INPUT: 'בקשה לא תקינה',
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
 * Logs the full error server-side. Vercel runtime captures console.error
 * into queryable logs via `vercel logs` and the dashboard.
 */
export function logServerError(context: string, err: unknown): void {
  const detail = err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { value: String(err) }
  console.error(`[server-error] ${context}`, JSON.stringify(detail))
}
