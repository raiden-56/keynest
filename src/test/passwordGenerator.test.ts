import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATOR_OPTIONS,
  evaluateStrength,
  generatePassword,
  type GeneratorOptions,
} from '../services/passwordGeneratorService'

describe('passwordGeneratorService', () => {
  it('honours length and includes every enabled class', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 16 })
      expect(pw).toHaveLength(16)
      expect(/[A-Z]/.test(pw)).toBe(true)
      expect(/[a-z]/.test(pw)).toBe(true)
      expect(/\d/.test(pw)).toBe(true)
      expect(/[^A-Za-z0-9]/.test(pw)).toBe(true)
    }
  })

  it('clamps length into the 12–64 range', () => {
    expect(generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 4 })).toHaveLength(12)
    expect(generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 500 })).toHaveLength(64)
  })

  it('respects disabled classes and ambiguous exclusion', () => {
    const opts: GeneratorOptions = { length: 32, uppercase: false, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: true }
    for (let i = 0; i < 30; i++) {
      const pw = generatePassword(opts)
      expect(/^[a-z0-9]+$/.test(pw)).toBe(true)
      expect(/[l1o0]/.test(pw)).toBe(false)
    }
  })

  it('throws when no character class is enabled', () => {
    expect(() => generatePassword({ length: 12, uppercase: false, lowercase: false, numbers: false, symbols: false, excludeAmbiguous: false })).toThrow()
  })

  it('produces distinct passwords', () => {
    const set = new Set(Array.from({ length: 100 }, () => generatePassword(DEFAULT_GENERATOR_OPTIONS)))
    expect(set.size).toBe(100)
  })

  it('rates strength and policy compliance sensibly', () => {
    expect(evaluateStrength('password').score).toBe(0)
    expect(evaluateStrength('').meetsPolicy).toBe(false)
    const strong = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 24 })
    const result = evaluateStrength(strong, { ...DEFAULT_GENERATOR_OPTIONS, length: 24 })
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.meetsPolicy).toBe(true)
    const short = evaluateStrength('Ab1!Ab1!Ab1!', { ...DEFAULT_GENERATOR_OPTIONS, length: 20 })
    expect(short.meetsPolicy).toBe(false)
  })
})
