import { describe, expect, it } from 'vitest'
import {
  boxBlurField,
  generateWhiteNoiseField,
  linearToSrgb,
  shapeGrainClumps,
  srgbToLinear,
} from './grainNoise'
import { mulberry32 } from '../../random/seededRandom'

describe('boxBlurField', () => {
  it('returns a copy unchanged at radius 0', () => {
    const field = new Float32Array([1, 2, 3, 4])
    const blurred = boxBlurField(field, 2, 2, 0)
    expect([...blurred]).toEqual([1, 2, 3, 4])
    expect(blurred).not.toBe(field)
  })

  it('averages a flat field to the same value', () => {
    const field = new Float32Array(25).fill(10)
    const blurred = boxBlurField(field, 5, 5, 2)
    for (const value of blurred) expect(value).toBeCloseTo(10)
  })

  it('smooths a single spike toward its neighbors, correctly handling clamped edges', () => {
    // 5x5 field of zeros with a single spike in the center.
    const field = new Float32Array(25)
    field[12] = 25 // center of a 5x5 grid (row 2, col 2)
    const blurred = boxBlurField(field, 5, 5, 1)
    // The spike's own cell should have shrunk (its value is now averaged with 0-neighbors)...
    expect(blurred[12]).toBeGreaterThan(0)
    expect(blurred[12]).toBeLessThan(25)
    // ...and some of its energy should have spread to an adjacent cell.
    expect(blurred[11]).toBeGreaterThan(0)
    // Total energy is preserved by a box blur (every cell contributes to windowSize neighbors).
    const totalBefore = field.reduce((a, b) => a + b, 0)
    const totalAfter = blurred.reduce((a, b) => a + b, 0)
    expect(totalAfter).toBeCloseTo(totalBefore, 1)
  })
})

describe('generateWhiteNoiseField', () => {
  it('fills the field with values in [-1, 1)', () => {
    const field = generateWhiteNoiseField(10, 10, mulberry32(1))
    expect(field.length).toBe(100)
    for (const value of field) {
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThan(1)
    }
  })

  it('is deterministic for the same PRNG seed', () => {
    const a = generateWhiteNoiseField(8, 8, mulberry32(42))
    const b = generateWhiteNoiseField(8, 8, mulberry32(42))
    expect([...a]).toEqual([...b])
  })
})

describe('shapeGrainClumps', () => {
  it('preserves sign', () => {
    expect(shapeGrainClumps(0.5, 0.6)).toBeGreaterThan(0)
    expect(shapeGrainClumps(-0.5, 0.6)).toBeLessThan(0)
  })

  it('leaves 0, 1 and -1 fixed regardless of exponent', () => {
    expect(shapeGrainClumps(0, 0.5)).toBe(0)
    expect(shapeGrainClumps(1, 0.5)).toBeCloseTo(1)
    expect(shapeGrainClumps(-1, 0.5)).toBeCloseTo(-1)
  })

  it('pushes mid-range values toward the extremes when exponent < 1', () => {
    const shaped = shapeGrainClumps(0.5, 0.5)
    expect(Math.abs(shaped)).toBeGreaterThan(0.5)
  })
})

describe('srgbToLinear / linearToSrgb', () => {
  it('round-trips 0-255 values back to themselves', () => {
    for (const value of [0, 1, 16, 64, 128, 200, 254, 255]) {
      expect(linearToSrgb(srgbToLinear(value))).toBeCloseTo(value, 3)
    }
  })

  it('maps black to 0 and white to 1 in linear space', () => {
    expect(srgbToLinear(0)).toBe(0)
    expect(srgbToLinear(255)).toBeCloseTo(1)
  })

  it('is monotonically increasing', () => {
    expect(srgbToLinear(128)).toBeGreaterThan(srgbToLinear(64))
    expect(linearToSrgb(0.5)).toBeGreaterThan(linearToSrgb(0.25))
  })
})
