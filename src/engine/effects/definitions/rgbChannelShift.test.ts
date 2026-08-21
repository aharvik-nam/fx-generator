import { describe, expect, it } from 'vitest'
import { applyRgbChannelShift } from './rgbChannelShift'

function makeGradient(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = x * 10 // red ramps with x
      data[i + 1] = 100 // green flat, used to detect it's untouched
      data[i + 2] = x * 10 // blue ramps with x too, so a shift is detectable
      data[i + 3] = 255
    }
  }
  return data
}

describe('applyRgbChannelShift', () => {
  it('is a no-op at amount 0', () => {
    const data = makeGradient(10, 1)
    const before = Array.from(data)
    applyRgbChannelShift(data, 10, 1, { amount: 0, angle: 0 }, 0)
    expect(Array.from(data)).toEqual(before)
  })

  it('leaves the green channel untouched', () => {
    const data = makeGradient(10, 1)
    applyRgbChannelShift(data, 10, 1, { amount: 3, angle: 0 }, 0)
    for (let x = 0; x < 10; x++) {
      expect(data[x * 4 + 1]).toBe(100)
    }
  })

  it('shifts red and blue channels in opposite directions horizontally', () => {
    const data = makeGradient(10, 1)
    applyRgbChannelShift(data, 10, 1, { amount: 3, angle: 0 }, 0)
    // At x=5: red should read from source x=5-3=2 (value 20), blue from source x=5+3=8 (value 80)
    const i = 5 * 4
    expect(data[i]).toBe(20)
    expect(data[i + 2]).toBe(80)
  })

  it('clamps sampling to the edge instead of wrapping', () => {
    const data = makeGradient(10, 1)
    applyRgbChannelShift(data, 10, 1, { amount: 20, angle: 0 }, 0)
    // Every sample position is out of bounds, so red clamps to x=0 and blue clamps to x=9.
    expect(data[0]).toBe(0)
    expect(data[9 * 4 + 2]).toBe(90)
  })
})
