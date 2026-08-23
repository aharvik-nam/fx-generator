import { describe, expect, it } from 'vitest'
import { computeStippleDots } from './stippling'

function flatGrid(width: number, height: number, luminance: number): Float32Array {
  return new Float32Array(width * height).fill(luminance)
}

describe('computeStippleDots', () => {
  it('places no dots on a fully white image, regardless of density', () => {
    const grid = flatGrid(20, 20, 255)
    expect(computeStippleDots(grid, 20, 20, 5, 3, 1.5, 1)).toHaveLength(0)
  })

  it('places a dot in every cell when darkness*density reaches 1 (probability is never >= 1)', () => {
    const grid = flatGrid(20, 20, 0) // fully black -> darkness 1
    const dots = computeStippleDots(grid, 20, 20, 5, 1, 1.5, 1)
    // A 20x20 image with 5px cells is a 4x4 grid of cells.
    expect(dots).toHaveLength(16)
  })

  it('is deterministic for the same seed', () => {
    const grid = flatGrid(20, 20, 128)
    const a = computeStippleDots(grid, 20, 20, 5, 1.5, 1.5, 42)
    const b = computeStippleDots(grid, 20, 20, 5, 1.5, 1.5, 42)
    expect(a).toEqual(b)
  })

  it('produces a different result for a different seed', () => {
    const grid = flatGrid(20, 20, 128)
    const a = computeStippleDots(grid, 20, 20, 5, 1.5, 1.5, 1)
    const b = computeStippleDots(grid, 20, 20, 5, 1.5, 1.5, 999999)
    expect(a).not.toEqual(b)
  })

  it('places more dots in a darker image than a lighter one, same seed', () => {
    const dark = computeStippleDots(flatGrid(30, 30, 20), 30, 30, 5, 1, 1.5, 7)
    const light = computeStippleDots(flatGrid(30, 30, 220), 30, 30, 5, 1, 1.5, 7)
    expect(dark.length).toBeGreaterThan(light.length)
  })

  it('keeps every dot radius within the expected jitter range around dotSize', () => {
    const grid = flatGrid(20, 20, 0)
    const dots = computeStippleDots(grid, 20, 20, 5, 1, 2, 3)
    for (const dot of dots) {
      expect(dot.radius).toBeGreaterThanOrEqual(2 * 0.6)
      expect(dot.radius).toBeLessThanOrEqual(2 * 1.4)
    }
  })
})
