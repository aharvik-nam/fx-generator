import { describe, expect, it } from 'vitest'
import { applyBlurSharpen, gaussianBlur, gaussianKernel1D } from './blurSharpen'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

/** applyBlurSharpen's `radius` param is scaled by canvas resolution (see resolutionScale.ts) —
 * this converts a desired *effective* sigma back into the raw param value that produces it at a
 * given (tiny, non-reference) test canvas size. */
function rawRadiusFor(effectiveSigma: number, width: number, height: number): number {
  return effectiveSigma / resolutionScaleFactor(width, height)
}

function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return data
}

describe('gaussianKernel1D', () => {
  it('sums to ~1 (a normalized kernel)', () => {
    const kernel = gaussianKernel1D(3)
    const sum = kernel.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('is symmetric around its center', () => {
    const kernel = gaussianKernel1D(4)
    const mid = (kernel.length - 1) / 2
    for (let i = 1; i <= mid; i++) {
      expect(kernel[mid - i]).toBeCloseTo(kernel[mid + i], 8)
    }
  })

  it('peaks at the center', () => {
    const kernel = gaussianKernel1D(2)
    const mid = (kernel.length - 1) / 2
    const others = kernel.filter((_, i) => i !== mid)
    for (const value of others) {
      expect(kernel[mid]).toBeGreaterThan(value)
    }
  })
})

describe('gaussianBlur', () => {
  it('leaves a flat-color image unchanged (edge-clamped correctly)', () => {
    const width = 12
    const height = 12
    const data = makeImage(width, height, () => 128)
    const blurred = gaussianBlur(data, width, height, 3)
    for (let i = 0; i < blurred.length; i++) {
      expect(blurred[i]).toBeCloseTo(128, 1)
    }
  })

  it('spreads a single bright pixel to its neighbors', () => {
    const width = 21
    const height = 21
    const data = makeImage(width, height, (x, y) => (x === 10 && y === 10 ? 255 : 0))
    const blurred = gaussianBlur(data, width, height, 2)
    const center = (10 * width + 10) * 3
    const neighbor = (10 * width + 11) * 3
    expect(blurred[center]).toBeLessThan(255)
    expect(blurred[neighbor]).toBeGreaterThan(0)
  })
})

describe('applyBlurSharpen', () => {
  it('leaves the image unchanged when amount is 0', () => {
    const width = 8
    const height = 8
    const data = makeImage(width, height, (x, y) => (x + y) * 10)
    const before = Uint8ClampedArray.from(data)
    applyBlurSharpen(data, width, height, { radius: 3, amount: 0 }, 0)
    expect(data).toEqual(before)
  })

  it('matches a plain Gaussian blur when amount is -1', () => {
    const width = 8
    const height = 8
    const data = makeImage(width, height, (x) => (x < 4 ? 40 : 200))
    const reference = gaussianBlur(data, width, height, 2)
    applyBlurSharpen(data, width, height, { radius: rawRadiusFor(2, width, height), amount: -1 }, 0)
    for (let p = 0; p < width * height; p++) {
      expect(Math.abs(data[p * 4] - reference[p * 3])).toBeLessThanOrEqual(1)
    }
  })

  it('exaggerates contrast across an edge when amount is positive (unsharp halo)', () => {
    const width = 12
    const height = 4
    const data = makeImage(width, height, (x) => (x < 6 ? 80 : 180))
    applyBlurSharpen(data, width, height, { radius: rawRadiusFor(2, width, height), amount: 1 }, 0)
    // Just left of the edge should overshoot darker than the original 80; just right should
    // overshoot brighter than the original 180 — a plain blur could never do either.
    expect(data[(2 * width + 5) * 4]).toBeLessThan(80)
    expect(data[(2 * width + 6) * 4]).toBeGreaterThan(180)
  })
})
