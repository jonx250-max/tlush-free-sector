import { describe, it, expect } from 'vitest'
import { buildPayload } from './errorTracking'

describe('buildPayload', () => {
  it('extracts message + stack from Error', () => {
    const e = new Error('boom')
    const p = buildPayload(e)
    expect(p.message).toBe('boom')
    expect(p.stack).toContain('boom')
  })

  it('coerces non-Error values to string messages', () => {
    expect(buildPayload('plain string').message).toBe('plain string')
    expect(buildPayload(42).message).toBe('42')
    expect(buildPayload({ foo: 'bar' }).message).toBe('[object Object]')
  })

  it('truncates very long messages to 2000 chars', () => {
    const huge = 'x'.repeat(5000)
    expect(buildPayload(new Error(huge)).message.length).toBe(2000)
  })

  it('truncates stacks to 8000 chars', () => {
    const e = new Error('x')
    e.stack = 'y'.repeat(20000)
    expect(buildPayload(e).stack?.length).toBe(8000)
  })

  it('passes through extra context', () => {
    expect(buildPayload(new Error('x'), { route: '/upload' }).context).toEqual({ route: '/upload' })
  })
})
