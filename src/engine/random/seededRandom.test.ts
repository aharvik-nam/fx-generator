import { describe, expect, it } from 'vitest'
import { mulberry32 } from './seededRandom'

describe('mulberry32', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = mulberry32(829103)
    const b = mulberry32(829103)
    const sequenceA = Array.from({ length: 10 }, () => a())
    const sequenceB = Array.from({ length: 10 }, () => b())
    expect(sequenceA).toEqual(sequenceB)
  })

  it('produces a different first value for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it('stays within [0, 1)', () => {
    const random = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
