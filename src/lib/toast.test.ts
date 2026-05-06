import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pushToast, subscribeToasts, dismissToast, _resetToastsForTests, toast } from './toast'

describe('H4 — toast pub/sub', () => {
  beforeEach(() => {
    _resetToastsForTests()
  })

  it('subscriber fires on push + dismiss', () => {
    const heard: number[] = []
    subscribeToasts(ts => heard.push(ts.length))
    const id = pushToast({ message: 'hi', durationMs: 0 })
    expect(heard.at(-1)).toBe(1)
    dismissToast(id)
    expect(heard.at(-1)).toBe(0)
  })

  it('default variant is info', () => {
    let captured: { variant?: string } = {}
    subscribeToasts(ts => { captured = ts[0] ?? {} })
    pushToast({ message: 'x', durationMs: 0 })
    expect(captured.variant).toBe('info')
  })

  it('toast.success / .warning / .error use right variants', () => {
    let captured: Array<{ variant?: string }> = []
    subscribeToasts(ts => { captured = ts })
    toast.success('ok', { durationMs: 0 })
    toast.warning('careful', { durationMs: 0 })
    toast.error('bad', { durationMs: 0 })
    expect(captured.map(t => t.variant)).toEqual(['success', 'warning', 'error'])
  })

  it('auto-dismisses after durationMs', async () => {
    vi.useFakeTimers()
    let count = 0
    subscribeToasts(ts => { count = ts.length })
    pushToast({ message: 'go', durationMs: 100 })
    expect(count).toBe(1)
    vi.advanceTimersByTime(150)
    expect(count).toBe(0)
    vi.useRealTimers()
  })

  it('unsubscribe stops listening', () => {
    const heard: number[] = []
    const off = subscribeToasts(ts => heard.push(ts.length))
    pushToast({ message: 'a', durationMs: 0 })
    off()
    pushToast({ message: 'b', durationMs: 0 })
    // Length recorded once on subscribe (0) + once after first push (1).
    // Second push must NOT fire.
    expect(heard).toEqual([0, 1])
  })
})
