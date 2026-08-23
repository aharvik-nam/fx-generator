import { describe, expect, it } from 'vitest'
import { computeFlowLines } from './flowField'

describe('computeFlowLines', () => {
  it('is deterministic for the same seed', () => {
    const a = computeFlowLines(60, 60, 10, 10, 4, 5)
    const b = computeFlowLines(60, 60, 10, 10, 4, 5)
    expect(a).toEqual(b)
  })

  it('produces roughly one line per grid cell', () => {
    // A 60x60 image sampled on a 10px grid starting at spacing/2 -> 6 columns x 6 rows.
    const lines = computeFlowLines(60, 60, 10, 10, 4, 1)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThanOrEqual(36)
  })

  it('gives every line at least a start and one more point', () => {
    const lines = computeFlowLines(60, 60, 10, 10, 4, 3)
    for (const line of lines) {
      expect(line.points.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps every point within the image bounds', () => {
    const lines = computeFlowLines(60, 60, 10, 10, 4, 9)
    for (const line of lines) {
      for (const point of line.points) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThan(60)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThan(60)
      }
    }
  })

  it('varies the traced path for a different seed', () => {
    const a = computeFlowLines(60, 60, 10, 10, 4, 1)
    const b = computeFlowLines(60, 60, 10, 10, 4, 999)
    expect(a).not.toEqual(b)
  })

  it('turns gradually between consecutive segments instead of jumping unpredictably', () => {
    const lines = computeFlowLines(80, 80, 16, 12, 5, 2)
    for (const line of lines) {
      for (let i = 0; i < line.points.length - 2; i++) {
        const a1 = Math.atan2(
          line.points[i + 1].y - line.points[i].y,
          line.points[i + 1].x - line.points[i].x,
        )
        const a2 = Math.atan2(
          line.points[i + 2].y - line.points[i + 1].y,
          line.points[i + 2].x - line.points[i + 1].x,
        )
        let delta = Math.abs(a1 - a2)
        if (delta > Math.PI) delta = Math.PI * 2 - delta
        expect(delta).toBeLessThan(1)
      }
    }
  })
})
