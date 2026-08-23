import { describe, expect, it } from 'vitest'
import { applyPixelSort } from './pixelSort'

/** One row; each pixel's red/green/blue channel all equal `values[x]` (a grayscale value). */
function makeRow(values: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4)
  for (let x = 0; x < values.length; x++) {
    const i = x * 4
    data[i] = values[x]
    data[i + 1] = values[x]
    data[i + 2] = values[x]
    data[i + 3] = 255
  }
  return data
}

function redChannel(data: Uint8ClampedArray): number[] {
  const values: number[] = []
  for (let i = 0; i < data.length; i += 4) values.push(data[i])
  return values
}

describe('applyPixelSort', () => {
  it('sorts a contiguous bright run by ascending luminance', () => {
    // All five values are above the default 50% threshold (grayscale > 127.5).
    const data = makeRow([200, 130, 255, 150, 180])
    applyPixelSort(data, 5, 1, { threshold: 50 }, 0)
    expect(redChannel(data)).toEqual([130, 150, 180, 200, 255])
  })

  it('leaves dark pixels below the threshold untouched, sorting only the bright run around them', () => {
    // Dark, bright, bright, bright, dark (all three middle values clear the 50% threshold).
    const data = makeRow([10, 220, 160, 200, 20])
    applyPixelSort(data, 5, 1, { threshold: 50 }, 0)
    expect(redChannel(data)[0]).toBe(10)
    expect(redChannel(data)[4]).toBe(20)
    // The middle run (indices 1-3) is sorted ascending.
    expect(redChannel(data).slice(1, 4)).toEqual([160, 200, 220])
  })

  it('is a no-op when every pixel is below the threshold', () => {
    const data = makeRow([10, 20, 30, 5, 15])
    const before = Array.from(data)
    applyPixelSort(data, 5, 1, { threshold: 50 }, 0)
    expect(Array.from(data)).toEqual(before)
  })

  it('sorts a run that extends to the end of the row', () => {
    const data = makeRow([10, 220, 180, 255])
    applyPixelSort(data, 4, 1, { threshold: 50 }, 0)
    expect(redChannel(data)).toEqual([10, 180, 220, 255])
  })

  it('preserves alpha alongside each sorted pixel', () => {
    const data = new Uint8ClampedArray([
      200,
      200,
      200,
      10, // bright pixel, alpha 10
      150,
      150,
      150,
      200, // bright pixel, alpha 200
    ])
    applyPixelSort(data, 2, 1, { threshold: 50 }, 0)
    // After sorting ascending: 150 (alpha 200) then 200 (alpha 10).
    expect(data[0]).toBe(150)
    expect(data[3]).toBe(200)
    expect(data[4]).toBe(200)
    expect(data[7]).toBe(10)
  })

  it('sorts each row independently', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4)
    const rows = [
      [200, 150], // row 0
      [255, 180], // row 1
    ]
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const i = (y * 2 + x) * 4
        data[i] = rows[y][x]
        data[i + 1] = rows[y][x]
        data[i + 2] = rows[y][x]
        data[i + 3] = 255
      }
    }
    applyPixelSort(data, 2, 2, { threshold: 50 }, 0)
    expect(data[0]).toBe(150)
    expect(data[4]).toBe(200)
    expect(data[8]).toBe(180)
    expect(data[12]).toBe(255)
  })
})
