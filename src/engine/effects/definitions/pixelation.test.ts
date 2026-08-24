import { describe, expect, it } from 'vitest'
import { applyPixelation } from './pixelation'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

function makeGradient(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = x * 20
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 255
    }
  }
  return data
}

/** blockSize is scaled by canvas resolution (see resolutionScale.ts) — this converts a desired
 * *effective* pixel block size back into the raw param value that produces it at this test
 * canvas's (tiny, non-reference) size, so the tests below stay canvas-size-agnostic. */
function rawFor(effectivePx: number, width: number, height: number): number {
  return effectivePx / resolutionScaleFactor(width, height)
}

describe('applyPixelation', () => {
  it('is a no-op at block size 1', () => {
    const data = makeGradient(4, 4)
    const before = Array.from(data)
    applyPixelation(data, 4, 4, { blockSize: rawFor(1, 4, 4) }, 0)
    expect(Array.from(data)).toEqual(before)
  })

  it('makes every pixel within a block identical to the block average', () => {
    const data = makeGradient(4, 1) // red values: 0, 20, 40, 60 -> avg of first 2x1 block = 10
    applyPixelation(data, 4, 1, { blockSize: rawFor(2, 4, 1) }, 0)
    expect(data[0]).toBe(10)
    expect(data[4]).toBe(10)
    expect(data[8]).toBe(50) // avg of 40, 60
    expect(data[12]).toBe(50)
  })

  it('handles a partial block at the image edge', () => {
    const data = makeGradient(3, 1) // width 3 with blockSize 2 leaves a 1-pixel remainder block
    applyPixelation(data, 3, 1, { blockSize: rawFor(2, 3, 1) }, 0)
    expect(data[8]).toBe(40) // last block has just one pixel (x=2, value 40), average is itself
  })

  it('scales the effective block size with canvas resolution for the same param value', () => {
    const small = makeGradient(8, 1)
    applyPixelation(small, 8, 1, { blockSize: 400 }, 0) // tiny canvas -> small scale factor
    const smallBlocksDiffer = small[0] !== small[4]

    const large = new Uint8ClampedArray(1600 * 4)
    for (let x = 0; x < 1600; x++) large[x * 4] = Math.min(255, x / 6)
    applyPixelation(large, 1600, 1, { blockSize: 400 }, 0) // reference-sized canvas -> full effect
    const largeBlocksDiffer = large[0] !== large[1200 * 4]

    expect(smallBlocksDiffer).toBe(false) // 400px block on an 8px canvas is a total no-op
    expect(largeBlocksDiffer).toBe(true) // same param, reference-sized canvas -> real blocks
  })
})
