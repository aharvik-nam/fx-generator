import { describe, expect, it } from 'vitest'
import { applyOutline } from './outline'

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

/** A hard vertical black|white split at column `splitX` (columns < splitX are black). */
function makeVerticalSplit(width: number, height: number, splitX: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = x < splitX ? 0 : 255
      const i = (y * width + x) * 4
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return data
}

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4]
}

describe('applyOutline', () => {
  it('is entirely background on a flat, edgeless image', () => {
    const data = makeFlatImage(6, 4, 128)
    applyOutline(data, 6, 4, { threshold: 80, lineColor: '#000000', background: '#ffffff' }, 0)
    for (let i = 0; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('draws the line color exactly at a hard vertical edge, background elsewhere', () => {
    const data = makeVerticalSplit(8, 3, 4)
    applyOutline(data, 8, 3, { threshold: 80, lineColor: '#000000', background: '#ffffff' }, 0)
    // The gradient is strongest at the two columns straddling the split (x=3 and x=4).
    for (const x of [3, 4]) expect(pixel(data, 8, x, 1)).toBe(0)
    for (const x of [0, 1, 2, 5, 6, 7]) expect(pixel(data, 8, x, 1)).toBe(255)
  })

  it('a higher threshold suppresses edges that a lower one would catch', () => {
    const data = makeVerticalSplit(8, 3, 4)
    // The gradient magnitude at the split is 1020; a threshold above that finds no edges.
    applyOutline(data, 8, 3, { threshold: 1100, lineColor: '#000000', background: '#ffffff' }, 0)
    for (let i = 0; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('uses custom line/background colors', () => {
    const data = makeVerticalSplit(8, 3, 4)
    applyOutline(data, 8, 3, { threshold: 80, lineColor: '#ff0000', background: '#00ff00' }, 0)
    expect(pixel(data, 8, 3, 1)).toBe(255) // line color's red channel
    expect(pixel(data, 8, 0, 1)).toBe(0) // background color's red channel
  })

  it('preserves the alpha channel', () => {
    const data = makeFlatImage(2, 2, 100)
    data[3] = 128 // give the first pixel a non-opaque alpha
    applyOutline(data, 2, 2, { threshold: 80 }, 0)
    expect(data[3]).toBe(128)
  })
})
