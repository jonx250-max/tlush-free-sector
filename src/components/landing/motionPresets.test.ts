import { describe, it, expect } from 'vitest'
import { fadeUp, fadeInView } from './motionPresets'

describe('motionPresets', () => {
  it('fadeUp returns empty object when reduced', () => {
    expect(fadeUp(true)).toEqual({})
  })

  it('fadeUp returns initial/animate/transition when not reduced', () => {
    const m = fadeUp(false)
    expect(m.initial).toEqual({ opacity: 0, y: 40 })
    expect(m.animate).toEqual({ opacity: 1, y: 0 })
    const t = m.transition as { duration?: number }
    expect(t.duration).toBe(0.75)
  })

  it('fadeInView returns empty when reduced regardless of delay', () => {
    expect(fadeInView(true, 0)).toEqual({})
    expect(fadeInView(true, 1.5)).toEqual({})
  })

  it('fadeInView applies provided delay when not reduced', () => {
    const m = fadeInView(false, 0.3)
    const t = m.transition as { delay?: number }
    expect(t.delay).toBe(0.3)
    expect(m.whileInView).toEqual({ opacity: 1, y: 0 })
  })

  it('fadeInView defaults delay to 0 when omitted', () => {
    const m = fadeInView(false)
    const t = m.transition as { delay?: number }
    expect(t.delay).toBe(0)
  })
})
