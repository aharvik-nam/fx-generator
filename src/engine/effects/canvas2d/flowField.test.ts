import { describe, expect, it } from 'vitest'
import { flowAngleAt } from './flowField'

describe('flowAngleAt', () => {
  it('is a pure function of x, y, and seed', () => {
    expect(flowAngleAt(15, 42, 7)).toBe(flowAngleAt(15, 42, 7))
  })

  it('changes gradually over a small step instead of jumping unpredictably', () => {
    // A single spacing-sized step (8px) should shift the angle by a fraction of a radian, not
    // by anywhere near as much as two independent random() calls in [0, π) typically would.
    const a = flowAngleAt(100, 100, 3)
    const b = flowAngleAt(108, 100, 3)
    expect(Math.abs(a - b)).toBeLessThan(1)
  })

  it('varies across positions (not a flat constant everywhere)', () => {
    const angles = new Set<number>()
    for (let x = 0; x < 200; x += 10) angles.add(flowAngleAt(x, 50, 1))
    expect(angles.size).toBeGreaterThan(1)
  })

  it('produces a different flow for a different seed at the same position', () => {
    expect(flowAngleAt(50, 50, 1)).not.toBe(flowAngleAt(50, 50, 999))
  })

  it('defaults scale to 1 (no change from omitting it)', () => {
    expect(flowAngleAt(37, 91, 4)).toBe(flowAngleAt(37, 91, 4, 1))
  })

  it('stretches the wavelength with scale, so a scaled-down position matches the unscaled angle', () => {
    // At scale 2, position (200, 100) divides down to the same (100, 50) the wave is evaluated
    // at when scale is 1 — i.e. the flow pattern is 2x "bigger" in canvas-pixel terms.
    expect(flowAngleAt(200, 100, 5, 2)).toBeCloseTo(flowAngleAt(100, 50, 5, 1))
  })
})
