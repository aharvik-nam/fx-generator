import { describe, expect, it } from 'vitest'
import { applyOrderedDithering } from './orderedDithering'

function makeFlatImage(width: number, height: number, value: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
  return data
}

describe('applyOrderedDithering', () => {
  it('only ever produces one of the `levels` quantized step values', () => {
    const data = makeFlatImage(8, 8, 130)
    applyOrderedDithering(data, 8, 8, { levels: 4 }, 0)
    const step = 255 / 3
    const validValues = new Set([0, 1, 2, 3].map((n) => Math.round(n * step)))
    for (let i = 0; i < data.length; i += 4) {
      expect(validValues.has(data[i])).toBe(true)
    }
  })

  it('produces more than one distinct value across a flat mid-gray image (that is the point of dithering)', () => {
    const data = makeFlatImage(8, 8, 130)
    applyOrderedDithering(data, 8, 8, { levels: 4 }, 0)
    const distinctValues = new Set<number>()
    for (let i = 0; i < data.length; i += 4) distinctValues.add(data[i])
    expect(distinctValues.size).toBeGreaterThan(1)
  })

  it('is deterministic for the same input', () => {
    const dataA = makeFlatImage(8, 8, 90)
    const dataB = makeFlatImage(8, 8, 90)
    applyOrderedDithering(dataA, 8, 8, { levels: 4 }, 0)
    applyOrderedDithering(dataB, 8, 8, { levels: 4 }, 0)
    expect(Array.from(dataA)).toEqual(Array.from(dataB))
  })

  it('keeps values within the valid range', () => {
    const data = makeFlatImage(8, 8, 250)
    applyOrderedDithering(data, 8, 8, { levels: 8 }, 0)
    for (const value of data) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })
})
