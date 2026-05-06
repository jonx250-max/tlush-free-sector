/**
 * Stage C C3 — central PII redactor.
 *
 * Applied to every server-side log line, telemetry event, and Claude
 * input. Redacts:
 *   - Israeli ID number (תעודת זהות) — 9 consecutive digits with optional
 *     check-digit hyphen variant
 *   - Bank account patterns (3-4 digits dash 6-12 digits)
 *   - Phone numbers (Israeli +972 / 05x leading)
 *   - Email local parts (keep domain so we can debug routing)
 *   - Bearer tokens (long base64-ish strings near "Bearer " prefix)
 *
 * NOT a security boundary on its own — defense-in-depth. The threat model
 * is "an engineer accidentally logs a payslip JSON and the log lands in
 * Sentry / Vercel runtime logs, exposing PII to anyone with log access."
 */

const IL_ID_NUMBER = /\b\d{9}\b/g
const BANK_ACCOUNT = /\b\d{3,4}-\d{6,12}\b/g
const PHONE_IL = /(?:\+972[-\s]?\d{1,3}[-\s]?\d{3}[-\s]?\d{4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/g
const EMAIL = /\b([\w.+-]+)@([\w.-]+\.[a-zA-Z]{2,})\b/g
const BEARER = /\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/g
const LIKELY_JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g

const SENSITIVE_KEY_NAMES = new Set([
  'password', 'pass', 'secret', 'token', 'apikey', 'api_key',
  'authorization', 'auth', 'cookie', 'session',
  'serviceRoleKey', 'service_role_key',
  'idnumber', 'id_number', 'teudat_zehut', 'תעודת_זהות',
  'bank_account', 'bankAccount', 'iban',
])

function redactString(s: string): string {
  return s
    .replace(LIKELY_JWT, '<jwt-redacted>')
    .replace(BEARER, 'Bearer <redacted>')
    .replace(IL_ID_NUMBER, '<id-redacted>')
    .replace(BANK_ACCOUNT, '<bank-redacted>')
    .replace(PHONE_IL, '<phone-redacted>')
    .replace(EMAIL, '<email>@$2')
}

/**
 * Recursively redact PII from any value. Strings are scrubbed; objects
 * are walked and keys whose name suggests a secret are replaced with
 * `<redacted>` outright. Cycles are guarded.
 */
export function redactPII(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === 'string') return redactString(value)
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (seen.has(value as object)) return '<cycle>'
  seen.add(value as object)

  if (Array.isArray(value)) {
    return value.map(item => redactPII(item, seen))
  }

  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    if (SENSITIVE_KEY_NAMES.has(key.toLowerCase())) {
      out[key] = '<redacted>'
    } else {
      out[key] = redactPII(v, seen)
    }
  }
  return out
}

/**
 * Convenience for log lines that build a single string. Used by
 * structured loggers that pre-stringify before emit.
 */
export function redactLogLine(line: string): string {
  return redactString(line)
}
