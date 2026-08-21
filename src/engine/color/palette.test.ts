import { describe, expect, it } from 'vitest'
import { extractDominantColors } from './palette'

function makePixels(colors: [number, number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4)
  colors.forEach(([r, g, b, a], index) => {
    data.set([r, g, b, a], index * 4)
  })
  return data
}

describe('extractDominantColors', () => {
  it('returns the single dominant color for a flat image (rounded to the quantization step)', () => {
    const data = makePixels(Array.from({ length: 16 }, () => [200, 50, 50, 255]))
    // 200 -> round(200/32)*32 = 192 (0xc0); 50 -> round(50/32)*32 = 64 (0x40)
    expect(extractDominantColors(data, 5)).toEqual(['#c04040'])
  })

  it('orders colors by frequency, most common first', () => {
    const data = makePixels([
      ...Array.from({ length: 10 }, () => [0, 0, 0, 255] as [number, number, number, number]),
      ...Array.from({ length: 3 }, () => [255, 255, 255, 255] as [number, number, number, number]),
    ])
    const palette = extractDominantColors(data, 2)
    expect(palette[0]).toBe('#000000')
    expect(palette[1]).toBe('#ffffff')
  })

  it('ignores mostly-transparent pixels', () => {
    const data = makePixels([
      [10, 10, 10, 0],
      [10, 10, 10, 10],
      [200, 200, 200, 255],
    ])
    // 200 -> round(200/32)*32 = 192 (0xc0)
    expect(extractDominantColors(data, 5)).toEqual(['#c0c0c0'])
  })

  it('caps the result at the requested count', () => {
    const data = makePixels([
      [0, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ])
    expect(extractDominantColors(data, 2)).toHaveLength(2)
  })

  it('returns an empty array for fully transparent input', () => {
    const data = makePixels([
      [10, 10, 10, 0],
      [20, 20, 20, 0],
    ])
    expect(extractDominantColors(data, 5)).toEqual([])
  })
})
