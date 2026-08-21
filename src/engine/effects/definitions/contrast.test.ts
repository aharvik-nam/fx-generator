import { describe, expect, it } from 'vitest'
import { applyContrast } from './contrast'

function makePixel(r: number, g: number, b: number): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, 255])
}

describe('applyContrast', () => {
  it('leaves the image unchanged at amount 0', () => {
    const data = makePixel(90, 128, 200)
    applyContrast(data, 1, 1, { amount: 0 }, 0)
    expect(Array.from(data.slice(0, 3))).toEqual([90, 128, 200])
  })

  it('leaves mid-gray (128) unchanged regardless of amount', () => {
    const data = makePixel(128, 128, 128)
    applyContrast(data, 1, 1, { amount: 80 }, 0)
    expect(Array.from(data.slice(0, 3))).toEqual([128, 128, 128])
  })

  it('pushes values away from mid-gray for positive amounts', () => {
    const data = makePixel(150, 150, 150)
    applyContrast(data, 1, 1, { amount: 80 }, 0)
    expect(data[0]).toBeGreaterThan(150)
  })

  it('pulls values toward mid-gray for negative amounts', () => {
    const data = makePixel(200, 200, 200)
    applyContrast(data, 1, 1, { amount: -80 }, 0)
    expect(data[0]).toBeLessThan(200)
    expect(data[0]).toBeGreaterThan(128)
  })
})
