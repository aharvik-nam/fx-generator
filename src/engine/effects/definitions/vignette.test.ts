import { describe, expect, it } from 'vitest'
import { applyVignette } from './vignette'

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

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4]
}

describe('applyVignette', () => {
  it('is a no-op at amount 0', () => {
    const data = makeFlatImage(10, 10, 200)
    applyVignette(data, 10, 10, { amount: 0, size: 0.5, softness: 0.5 }, 0)
    expect(pixelAt(data, 10, 5, 5)).toBe(200)
    expect(pixelAt(data, 10, 0, 0)).toBe(200)
  })

  it('leaves the center brighter than the corners', () => {
    const data = makeFlatImage(20, 20, 200)
    applyVignette(data, 20, 20, { amount: 1, size: 0.2, softness: 0.5 }, 0)
    const center = pixelAt(data, 20, 10, 10)
    const corner = pixelAt(data, 20, 0, 0)
    expect(corner).toBeLessThan(center)
  })

  it('keeps values within the valid range', () => {
    const data = makeFlatImage(10, 10, 255)
    applyVignette(data, 10, 10, { amount: 1, size: 0, softness: 0.01 }, 0)
    for (const value of data) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })
})
