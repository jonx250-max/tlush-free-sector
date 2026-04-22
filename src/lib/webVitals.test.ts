import { describe, it, expect } from 'vitest'
import { classify } from './webVitals'

describe('web-vitals classify', () => {
  it('rates LCP thresholds', () => {
    expect(classify({ name: 'LCP', value: 1000 })).toBe('good')
    expect(classify({ name: 'LCP', value: 3000 })).toBe('needs-improvement')
    expect(classify({ name: 'LCP', value: 5000 })).toBe('poor')
  })

  it('rates CLS thresholds', () => {
    expect(classify({ name: 'CLS', value: 0.05 })).toBe('good')
    expect(classify({ name: 'CLS', value: 0.15 })).toBe('needs-improvement')
    expect(classify({ name: 'CLS', value: 0.3 })).toBe('poor')
  })

  it('rates INP thresholds', () => {
    expect(classify({ name: 'INP', value: 150 })).toBe('good')
    expect(classify({ name: 'INP', value: 300 })).toBe('needs-improvement')
    expect(classify({ name: 'INP', value: 700 })).toBe('poor')
  })

  it('boundaries count as good (inclusive lower)', () => {
    expect(classify({ name: 'LCP', value: 2500 })).toBe('good')
    expect(classify({ name: 'LCP', value: 4000 })).toBe('needs-improvement')
  })

  it('defaults unknown metrics to good', () => {
    expect(classify({ name: 'UNKNOWN', value: 99999 })).toBe('good')
  })
})
