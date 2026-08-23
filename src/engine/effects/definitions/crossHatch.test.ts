import { describe, expect, it } from 'vitest'
import { computeHatchLines } from './crossHatch'

/** A single cell (cellSize === width === height) filled with one luminance value. */
function singleCellGrid(size: number, luminance: number): Float32Array {
  return new Float32Array(size * size).fill(luminance)
}

describe('computeHatchLines', () => {
  it('draws no lines for a fully white (darkness 0) cell', () => {
    const lines = computeHatchLines(singleCellGrid(10, 255), 10, 10, 10)
    expect(lines).toHaveLength(0)
  })

  it('draws exactly one diagonal for a cell just past the first darkness threshold', () => {
    // luminance 200 -> darkness = 1 - 200/255 ≈ 0.216, clears 0.2 but not 0.4/0.6/0.8.
    const lines = computeHatchLines(singleCellGrid(10, 200), 10, 10, 10)
    expect(lines).toHaveLength(1)
  })

  it('draws three crossing directions for a cell past the third threshold', () => {
    // luminance 100 -> darkness ≈ 0.608, clears 0.2/0.4/0.6 but not 0.8.
    const lines = computeHatchLines(singleCellGrid(10, 100), 10, 10, 10)
    expect(lines).toHaveLength(3)
  })

  it('draws all four directions for a fully black (darkness 1) cell', () => {
    const lines = computeHatchLines(singleCellGrid(10, 0), 10, 10, 10)
    expect(lines).toHaveLength(4)
  })

  it('produces one set of lines per grid cell', () => {
    // A 20x10 image split into two 10x10 cells, both fully black -> 4 lines each.
    const luminance = new Float32Array(20 * 10).fill(0)
    const lines = computeHatchLines(luminance, 20, 10, 10)
    expect(lines).toHaveLength(8)
  })

  it('keeps every line segment within the image bounds', () => {
    const lines = computeHatchLines(singleCellGrid(10, 0), 10, 10, 10)
    for (const line of lines) {
      expect(line.x1).toBeGreaterThanOrEqual(0)
      expect(line.x2).toBeGreaterThanOrEqual(0)
      expect(line.y1).toBeGreaterThanOrEqual(0)
      expect(line.y2).toBeGreaterThanOrEqual(0)
      expect(line.x1).toBeLessThanOrEqual(10)
      expect(line.x2).toBeLessThanOrEqual(10)
    }
  })
})
