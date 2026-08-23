import { describe, expect, it } from 'vitest'
import { computeParticlePositions } from './particles'

function flatGrid(width: number, height: number, luminance: number): Float32Array {
  return new Float32Array(width * height).fill(luminance)
}

describe('computeParticlePositions', () => {
  it('places no particles on a fully black image (zero acceptance probability)', () => {
    const grid = flatGrid(30, 30, 0)
    expect(computeParticlePositions(grid, 30, 30, 200, 1.5, 1)).toHaveLength(0)
  })

  it('places exactly `count` particles on a fully white image (acceptance probability 1)', () => {
    const grid = flatGrid(30, 30, 255)
    expect(computeParticlePositions(grid, 30, 30, 200, 1.5, 1)).toHaveLength(200)
  })

  it('is deterministic for the same seed', () => {
    const grid = flatGrid(30, 30, 160)
    const a = computeParticlePositions(grid, 30, 30, 150, 1.5, 42)
    const b = computeParticlePositions(grid, 30, 30, 150, 1.5, 42)
    expect(a).toEqual(b)
  })

  it('produces a different scatter for a different seed', () => {
    const grid = flatGrid(30, 30, 160)
    const a = computeParticlePositions(grid, 30, 30, 150, 1.5, 1)
    const b = computeParticlePositions(grid, 30, 30, 150, 1.5, 999)
    expect(a).not.toEqual(b)
  })

  it('places more particles in a brighter image than a darker one, same seed', () => {
    // luminance=3 keeps acceptance probability low enough (~1.2%) that the attempt budget
    // (count * 40) runs out before reaching the requested count, so it actually undershoots
    // instead of both images saturating at the same cap.
    const bright = computeParticlePositions(flatGrid(40, 40, 230), 40, 40, 500, 1.5, 7)
    const dark = computeParticlePositions(flatGrid(40, 40, 3), 40, 40, 500, 1.5, 7)
    expect(bright.length).toBeGreaterThan(dark.length)
  })

  it('keeps every particle position within bounds and radius within the jitter range', () => {
    const grid = flatGrid(30, 30, 255)
    const particles = computeParticlePositions(grid, 30, 30, 100, 2, 3)
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(30)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(30)
      expect(p.radius).toBeGreaterThanOrEqual(2 * 0.5)
      expect(p.radius).toBeLessThanOrEqual(2 * 1.5)
    }
  })
})
