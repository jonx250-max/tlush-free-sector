/**
 * Stage F2 — Result/Either type for use-case return values.
 *
 * Codifies "this can fail with one of these named errors" without
 * throwing for control flow. Throwing is reserved for genuinely
 * unexpected conditions (programmer bugs, infra outages); business
 * outcomes flow as Result.
 *
 * Usage:
 *
 *   function parsePayslip(input: string): Result<ParsedPayslip, 'EMPTY' | 'OCR_FAILED'> {
 *     if (!input) return err('EMPTY')
 *     const r = doParse(input)
 *     if (!r) return err('OCR_FAILED')
 *     return ok(r)
 *   }
 *
 *   const r = parsePayslip(text)
 *   if (!r.ok) return res.status(400).json({ code: r.error })
 *   const payslip = r.value
 */

export type Ok<T> = { ok: true; value: T }
export type Err<E> = { ok: false; error: E; details?: unknown }
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E, details?: unknown): Err<E> {
  return { ok: false, error, details }
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok === true
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.ok === false
}

/** Map an Ok value through a function, leaving Err untouched. */
export function map<T, U, E>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r
}

/** Chain another Result-returning function on the Ok value. */
export function chain<T, U, E>(r: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return r.ok ? fn(r.value) : r
}

/** Unwrap or throw — use only in tests or after a guard. */
export function unwrap<T, E>(r: Result<T, E>): T {
  if (!r.ok) throw new Error(`Result was Err: ${String(r.error)}`)
  return r.value
}
