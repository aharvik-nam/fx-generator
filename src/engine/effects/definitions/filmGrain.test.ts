import { describe, expect, it } from 'vitest'
import { applyFilmGrain } from './filmGrain'

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

describe('applyFilmGrain', () => {
  it('is a no-op at amount 0', () => {
    const data = makeFlatImage(4, 4, 128)
    const before = [...data]
    applyFilmGrain(data, 4, 4, { amount: 0, size: 1 }, 42)
    expect([...data]).toEqual(before)
  })

  it('produces an identical result for the same seed', () => {
    const dataA = makeFlatImage(8, 8, 128)
    const dataB = makeFlatImage(8, 8, 128)
    applyFilmGrain(dataA, 8, 8, { amount: 0.3, size: 1 }, 829103)
    applyFilmGrain(dataB, 8, 8, { amount: 0.3, size: 1 }, 829103)
    expect([...dataA]).toEqual([...dataB])
  })

  it('produces a different result for a different seed', () => {
    const dataA = makeFlatImage(8, 8, 128)
    const dataB = makeFlatImage(8, 8, 128)
    applyFilmGrain(dataA, 8, 8, { amount: 0.3, size: 1 }, 1)
    applyFilmGrain(dataB, 8, 8, { amount: 0.3, size: 1 }, 2)
    expect([...dataA]).not.toEqual([...dataB])
  })

  it('applies the same noise value across an entire block when size > 1', () => {
    const data = makeFlatImage(4, 4, 128)
    applyFilmGrain(data, 4, 4, { amount: 0.5, size: 2 }, 7)
    // top-left 2x2 block should be uniform
    const topLeft = data[0]
    const topRight = data[4]
    const bottomLeft = data[16]
    const bottomRight = data[20]
    expect(topRight).toBe(topLeft)
    expect(bottomLeft).toBe(topLeft)
    expect(bottomRight).toBe(topLeft)
  })

  it('keeps values within the valid 0-255 range', () => {
    const data = makeFlatImage(4, 4, 250)
    applyFilmGrain(data, 4, 4, { amount: 1, size: 1 }, 99)
    for (const value of data) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })
})
