import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr, map, chain, unwrap, type Result } from './result'

describe('F2 — Result type', () => {
  it('ok constructs a success', () => {
    const r = ok(42)
    expect(r.ok).toBe(true)
    expect(isOk(r)).toBe(true)
    expect(r.ok && r.value).toBe(42)
  })

  it('err constructs a failure', () => {
    const r = err('NOT_FOUND')
    expect(r.ok).toBe(false)
    expect(isErr(r)).toBe(true)
    expect(!r.ok && r.error).toBe('NOT_FOUND')
  })

  it('map transforms Ok, leaves Err', () => {
    expect(unwrap(map(ok(2), x => x * 3))).toBe(6)
    const e = map(err<'FAIL'>('FAIL'), (x: number) => x * 3)
    expect(isErr(e)).toBe(true)
  })

  it('chain composes Result-returning fns', () => {
    const halfIfEven = (n: number): Result<number, 'ODD'> =>
      n % 2 === 0 ? ok(n / 2) : err('ODD')
    expect(unwrap(chain(ok(10), halfIfEven))).toBe(5)
    expect(isErr(chain(ok(7), halfIfEven))).toBe(true)
  })

  it('unwrap throws on Err', () => {
    expect(() => unwrap(err('boom'))).toThrow(/Err/)
  })
})
