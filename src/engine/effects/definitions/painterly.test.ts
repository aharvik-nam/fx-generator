import { describe, expect, it } from 'vitest'
import { computeBrushStrokes } from './painterly'

function flatGrid(width: number, height: number, luminance: number): Float32Array {
  return new Float32Array(width * height).fill(luminance)
}

/** A linear horizontal luminance ramp, identical on every row (so gy is always 0 and gx is a
 * constant, non-zero slope at every interior pixel) — gives every sample point in the image the
 * same strong, purely-horizontal gradient, regardless of exactly where the jittered grid lands. */
function horizontalRampGrid(width: number, height: number): Float32Array {
  const grid = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y * width + x] = (x / (width - 1)) * 255
    }
  }
  return grid
}

describe('computeBrushStrokes', () => {
  it('is deterministic for the same seed', () => {
    const grid = flatGrid(40, 40, 128)
    const a = computeBrushStrokes(grid, 40, 40, 8, 16, 42)
    const b = computeBrushStrokes(grid, 40, 40, 8, 16, 42)
    expect(a).toEqual(b)
  })

  it('produces roughly one stroke per grid cell', () => {
    const grid = flatGrid(40, 40, 128)
    const strokes = computeBrushStrokes(grid, 40, 40, 8, 16, 1)
    // A 40x40 image sampled on an 8px grid starting at spacing/2 -> 5 columns x 5 rows.
    expect(strokes).toHaveLength(25)
  })

  it('orients strokes along a strong, consistent gradient instead of across it', () => {
    // A purely horizontal gradient (gy=0) means the stroke angle (perpendicular to the
    // gradient) should be vertical everywhere: cos(angle) ≈ 0.
    const grid = horizontalRampGrid(40, 8)
    const strokes = computeBrushStrokes(grid, 40, 8, 8, 10, 3)
    expect(strokes.length).toBeGreaterThan(0)
    for (const stroke of strokes) {
      expect(Math.abs(Math.cos(stroke.angle))).toBeLessThan(0.15)
    }
  })

  it('falls back to a smoothly-varying flow-field angle on a flat image with no gradient', () => {
    const grid = flatGrid(60, 60, 128)
    const strokes = computeBrushStrokes(grid, 60, 60, 6, 10, 5)
    const distinctAngles = new Set(strokes.map((s) => s.angle))
    // Varies across the canvas (not one fixed angle everywhere)...
    expect(distinctAngles.size).toBeGreaterThan(1)
  })

  it('is a pure function of position and seed (same x/y/seed -> same flat-area angle)', () => {
    const grid = flatGrid(60, 60, 128)
    const a = computeBrushStrokes(grid, 60, 60, 10, 10, 11)
    const b = computeBrushStrokes(grid, 60, 60, 10, 10, 11)
    expect(a.map((s) => s.angle)).toEqual(b.map((s) => s.angle))
  })

  it('keeps stroke length within the expected jitter range around strokeLength', () => {
    const grid = flatGrid(40, 40, 128)
    const strokes = computeBrushStrokes(grid, 40, 40, 8, 20, 9)
    for (const stroke of strokes) {
      expect(stroke.length).toBeGreaterThanOrEqual(20 * 0.7)
      expect(stroke.length).toBeLessThanOrEqual(20 * 1.3)
    }
  })

  it('keeps every sample point within the image bounds', () => {
    const grid = flatGrid(40, 40, 128)
    const strokes = computeBrushStrokes(grid, 40, 40, 8, 16, 123)
    for (const stroke of strokes) {
      expect(stroke.x).toBeGreaterThanOrEqual(0)
      expect(stroke.x).toBeLessThan(40)
      expect(stroke.y).toBeGreaterThanOrEqual(0)
      expect(stroke.y).toBeLessThan(40)
    }
  })
})
