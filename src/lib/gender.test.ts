import { describe, it, expect } from 'vitest'
import { byGender, genderedTemplate } from './gender'

describe('H10 — gendered grammar', () => {
  it('byGender picks feminine when gender=female', () => {
    expect(byGender('female', 'מאשר', 'מאשרת')).toBe('מאשרת')
  })

  it('byGender defaults to masculine for male / unknown / null', () => {
    expect(byGender('male', 'מאשר', 'מאשרת')).toBe('מאשר')
    expect(byGender(undefined, 'מאשר', 'מאשרת')).toBe('מאשר')
    expect(byGender(null, 'מאשר', 'מאשרת')).toBe('מאשר')
  })

  it('genderedTemplate substitutes {{m|f}} markers', () => {
    expect(genderedTemplate('שלום {{אדוני|גברתי}}', 'female')).toBe('שלום גברתי')
    expect(genderedTemplate('שלום {{אדוני|גברתי}}', 'male')).toBe('שלום אדוני')
  })

  it('genderedTemplate handles multiple markers', () => {
    expect(genderedTemplate('{{עובד|עובדת}} {{שכיר|שכירה}}', 'female')).toBe('עובדת שכירה')
  })

  it('genderedTemplate leaves unrecognized braces alone', () => {
    expect(genderedTemplate('hello {world}', 'female')).toBe('hello {world}')
  })
})
