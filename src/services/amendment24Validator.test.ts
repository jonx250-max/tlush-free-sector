import { describe, it, expect } from 'vitest'
import { validateAmendment24 } from './amendment24Validator'

describe('validateAmendment24', () => {
  it('returns compliant for standard overtime model', () => {
    const result = validateAmendment24('standard', 12000, null, 15000)
    expect(result.compliant).toBe(true)
  })

  it('returns compliant for "none" overtime model', () => {
    const result = validateAmendment24('none', 10000, null, 10000)
    expect(result.compliant).toBe(true)
  })

  it('flags non-compliant when global salary not separated', () => {
    const result = validateAmendment24('global', 15000, null, 15000)
    expect(result.compliant).toBe(false)
    expect(result.entireAmountIsBase).toBe(true)
    expect(result.missingOvertimeLine).toBe(true)
  })

  it('flags non-compliant when overtime line is 0', () => {
    const result = validateAmendment24('global', 15000, 0, 15000)
    expect(result.compliant).toBe(false)
    expect(result.missingOvertimeLine).toBe(true)
  })

  it('passes when global salary properly separated', () => {
    const result = validateAmendment24('global', 12000, 3000, 15000)
    expect(result.compliant).toBe(true)
    expect(result.missingOvertimeLine).toBe(false)
  })

  it('includes legal reference', () => {
    const result = validateAmendment24('global', 15000, null, 15000)
    expect(result.legalReference).toContain('תיקון 24')
  })
})
