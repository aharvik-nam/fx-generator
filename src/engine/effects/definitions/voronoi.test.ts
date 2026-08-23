import { describe, expect, it } from 'vitest'
import {
  applyVoronoiMosaic,
  computeVoronoiAssignment,
  generateSeeds,
  nearestSeedIndex,
} from './voronoi'

describe('generateSeeds', () => {
  it('is deterministic for the same seed', () => {
    const a = generateSeeds(100, 100, 20, 42)
    const b = generateSeeds(100, 100, 20, 42)
    expect(a).toEqual(b)
  })

  it('produces exactly `count` points', () => {
    expect(generateSeeds(100, 100, 20, 1)).toHaveLength(20)
  })

  it('keeps every point within the image bounds', () => {
    const points = generateSeeds(50, 30, 40, 7)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(50)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(30)
    }
  })

  it('varies for a different seed', () => {
    const a = generateSeeds(100, 100, 20, 1)
    const b = generateSeeds(100, 100, 20, 999)
    expect(a).not.toEqual(b)
  })
})

describe('nearestSeedIndex', () => {
  it('picks the closer of two seeds', () => {
    const seeds = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(nearestSeedIndex(1, 1, seeds)).toBe(0)
    expect(nearestSeedIndex(9, 9, seeds)).toBe(1)
  })
})

describe('computeVoronoiAssignment', () => {
  it('splits a grid between two seeds at opposite corners', () => {
    const seeds = [
      { x: 0, y: 0 },
      { x: 3, y: 3 },
    ]
    const assignment = computeVoronoiAssignment(4, 4, seeds)
    expect(assignment[0]).toBe(0) // (0,0) -> seed 0
    expect(assignment[3 * 4 + 3]).toBe(1) // (3,3) -> seed 1
  })
})

describe('applyVoronoiMosaic', () => {
  it('recolors each cell to the average color of its own region', () => {
    // 4x2 image: left half red, right half blue. One seed on each half.
    const width = 4
    const height = 2
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const isLeft = x < width / 2
        data[i] = isLeft ? 255 : 0
        data[i + 1] = 0
        data[i + 2] = isLeft ? 0 : 255
        data[i + 3] = 255
      }
    }
    const seeds = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]
    applyVoronoiMosaic(data, width, height, seeds)

    // Left-half pixel should stay pure red (its whole cell was red), right-half pure blue.
    expect(Array.from(data.slice(0, 3))).toEqual([255, 0, 0])
    expect(Array.from(data.slice(12, 15))).toEqual([0, 0, 255])
  })

  it('does nothing when there are no seeds', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 255])
    applyVoronoiMosaic(data, 1, 1, [])
    expect(Array.from(data)).toEqual([10, 20, 30, 255])
  })
})
