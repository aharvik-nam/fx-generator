import { describe, expect, it } from 'vitest'
import { applyColorQuantize, computeKMeansPalette, nearestCentroidIndex } from './colorQuantize'

function gradientImage(steps: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(steps * 4)
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const j = i * 4
    data[j] = Math.round(t * 255)
    data[j + 1] = 0
    data[j + 2] = Math.round((1 - t) * 255)
    data[j + 3] = 255
  }
  return data
}

describe('nearestCentroidIndex', () => {
  it('picks the closer of two centroids', () => {
    const centroids = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ]
    expect(nearestCentroidIndex({ r: 10, g: 10, b: 10 }, centroids)).toBe(0)
    expect(nearestCentroidIndex({ r: 250, g: 250, b: 250 }, centroids)).toBe(1)
  })
})

describe('computeKMeansPalette', () => {
  it('returns exactly k centroids when the image has enough pixels', () => {
    const data = gradientImage(50)
    expect(computeKMeansPalette(data, 4, 6, 1)).toHaveLength(4)
  })

  it('caps the palette size to the number of pixels when k exceeds it', () => {
    const data = gradientImage(3)
    expect(computeKMeansPalette(data, 10, 6, 1)).toHaveLength(3)
  })

  it('is deterministic for the same seed', () => {
    const data = gradientImage(50)
    const a = computeKMeansPalette(data, 5, 6, 42)
    const b = computeKMeansPalette(data, 5, 6, 42)
    expect(a).toEqual(b)
  })

  it('produces a different palette for a different seed', () => {
    const data = gradientImage(50)
    const a = computeKMeansPalette(data, 5, 6, 1)
    const b = computeKMeansPalette(data, 5, 6, 999)
    expect(a).not.toEqual(b)
  })
})

describe('applyColorQuantize', () => {
  it('reduces a many-colored gradient to at most `colorCount` distinct colors', () => {
    const data = gradientImage(60) // 60 distinct colors going in
    applyColorQuantize(data, 60, 1, { colorCount: 4 }, 3)

    const distinct = new Set<string>()
    for (let i = 0; i < data.length; i += 4) {
      distinct.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
    }
    expect(distinct.size).toBeLessThanOrEqual(4)
  })
})
