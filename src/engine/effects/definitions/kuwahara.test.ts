import { describe, expect, it } from 'vitest'
import { kuwaharaPixel } from './kuwahara'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'

function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return data
}

describe('kuwaharaPixel', () => {
  it('leaves a flat-color image unchanged (every quadrant has zero variance)', () => {
    const width = 10
    const height = 10
    const data = makeImage(width, height, () => [128, 128, 128])
    const luminance = computeLuminanceGrid(data, width, height)
    const color = kuwaharaPixel(data, luminance, width, height, 5, 5, 2)
    expect(color).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('preserves a hard edge instead of blending across it like a plain blur would', () => {
    const width = 10
    const height = 10
    const data = makeImage(width, height, (x) => (x < 5 ? [0, 0, 0] : [255, 255, 255]))
    const luminance = computeLuminanceGrid(data, width, height)
    // Pixel right on the boundary column: a plain box blur here would land around mid-gray.
    const color = kuwaharaPixel(data, luminance, width, height, 5, 5, 2)
    expect(color).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('ignores an outlier confined to a single quadrant', () => {
    const width = 5
    const height = 5
    const data = makeImage(width, height, (x, y) =>
      x === 0 && y === 0 ? [255, 255, 255] : [100, 100, 100],
    )
    const luminance = computeLuminanceGrid(data, width, height)
    // Centered on (2,2) with radius 2, the outlier at (0,0) only falls inside the NW quadrant;
    // the other three quadrants are perfectly flat and one of them should win.
    const color = kuwaharaPixel(data, luminance, width, height, 2, 2, 2)
    expect(color).toEqual({ r: 100, g: 100, b: 100 })
  })
})
