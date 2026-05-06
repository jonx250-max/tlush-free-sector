import { describe, it, expect } from 'vitest'
import { t, plural } from './i18n'

describe('H9 — t() helper', () => {
  it('looks up a dotted path against he', () => {
    // results.title is in he.ts
    expect(t('results.title')).toBeTruthy()
    expect(t('results.title')).toContain('תוצאות')
  })

  it('falls back to the path on miss', () => {
    expect(t('nonexistent.key.path')).toBe('nonexistent.key.path')
  })

  it('uses provided fallback on miss', () => {
    expect(t('nonexistent', { fallback: 'שלום' })).toBe('שלום')
  })

  it('interpolates {var} placeholders', () => {
    expect(t('nope', { fallback: 'שלום {name}', vars: { name: 'דן' } })).toBe('שלום דן')
  })

  it('resolves {{m|f}} via gender', () => {
    expect(t('nope', { fallback: '{{אדוני|גברתי}}', gender: 'female' })).toBe('גברתי')
    expect(t('nope', { fallback: '{{אדוני|גברתי}}', gender: 'male' })).toBe('אדוני')
  })

  it('combines interpolation and gender', () => {
    const out = t('nope', {
      fallback: '{{שלום|שלום}} {name}, {{אתה|את}} {{זכאי|זכאית}}',
      vars: { name: 'מירי' },
      gender: 'female',
    })
    expect(out).toBe('שלום מירי, את זכאית')
  })
})

describe('H9 — plural', () => {
  it('one for count=1', () => {
    expect(plural(1, 'יום אחד', '{n} ימים')).toBe('יום אחד')
  })

  it('other for count!=1', () => {
    expect(plural(0, 'יום', 'ימים')).toBe('ימים')
    expect(plural(2, 'יום', 'ימים')).toBe('ימים')
  })
})
