import { describe, expect, it } from 'vitest'
import { RESOLUTION_SCALE_REFERENCE, resolutionScaleFactor } from './resolutionScale'

describe('resolutionScaleFactor', () => {
  it('is 1 at the reference long edge', () => {
    expect(resolutionScaleFactor(RESOLUTION_SCALE_REFERENCE, 900)).toBe(1)
    expect(resolutionScaleFactor(900, RESOLUTION_SCALE_REFERENCE)).toBe(1)
  })

  it('is less than 1 for a canvas smaller than the reference', () => {
    expect(resolutionScaleFactor(400, 300)).toBeCloseTo(400 / RESOLUTION_SCALE_REFERENCE)
  })

  it('is greater than 1 for a canvas larger than the reference', () => {
    expect(resolutionScaleFactor(6000, 4000)).toBeCloseTo(6000 / RESOLUTION_SCALE_REFERENCE)
  })

  it('uses the longest edge regardless of orientation', () => {
    expect(resolutionScaleFactor(3000, 1000)).toBe(resolutionScaleFactor(1000, 3000))
  })
})
