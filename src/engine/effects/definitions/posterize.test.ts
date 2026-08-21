import { describe, expect, it } from 'vitest'
import { applyPosterize } from './posterize'

function makePixel(r: number, g: number, b: number): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, 255])
}

describe('applyPosterize', () => {
  it('snaps values to one of exactly `levels` evenly-spaced steps', () => {
    const data = makePixel(0, 128, 255)
    applyPosterize(data, 1, 1, { levels: 2 }, 0)
    // With 2 levels, only 0 and 255 are valid outputs.
    expect([0, 255]).toContain(data[0])
    expect([0, 255]).toContain(data[1])
    expect([0, 255]).toContain(data[2])
  })

  it('leaves pure black and pure white unchanged', () => {
    const data = makePixel(0, 0, 255)
    applyPosterize(data, 1, 1, { levels: 4 }, 0)
    expect(data[0]).toBe(0)
    expect(data[2]).toBe(255)
  })

  it('produces more distinct values with more levels', () => {
    const twoLevelOutputs = new Set<number>()
    const eightLevelOutputs = new Set<number>()
    for (let v = 0; v <= 255; v += 17) {
      const a = makePixel(v, v, v)
      applyPosterize(a, 1, 1, { levels: 2 }, 0)
      twoLevelOutputs.add(a[0])

      const b = makePixel(v, v, v)
      applyPosterize(b, 1, 1, { levels: 8 }, 0)
      eightLevelOutputs.add(b[0])
    }
    expect(eightLevelOutputs.size).toBeGreaterThan(twoLevelOutputs.size)
  })

  it('preserves the alpha channel', () => {
    const data = new Uint8ClampedArray([100, 100, 100, 128])
    applyPosterize(data, 1, 1, { levels: 4 }, 0)
    expect(data[3]).toBe(128)
  })
})
