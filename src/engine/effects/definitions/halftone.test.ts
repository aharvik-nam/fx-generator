import { describe, expect, it } from 'vitest'
import { applyHalftone } from './halftone'

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

describe('applyHalftone', () => {
  it('draws a max-radius dot covering the cell center when the cell is fully black', () => {
    const data = makeFlatImage(10, 10, 0)
    applyHalftone(data, 10, 10, { cellSize: 10, dotColor: '#ff0000', background: '#00ff00' }, 0)
    // Max radius is half the cell size, which reaches the center but not the corners.
    const centerIndex = (5 * 10 + 5) * 4
    expect(data[centerIndex]).toBe(255)
    expect(data[centerIndex + 1]).toBe(0)
  })

  it('leaves a fully white cell as pure background (radius 0, no dot drawn)', () => {
    const data = makeFlatImage(10, 10, 255)
    applyHalftone(data, 10, 10, { cellSize: 10, dotColor: '#ff0000', background: '#00ff00' }, 0)
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBe(0)
      expect(data[i + 1]).toBe(255)
    }
  })

  it('produces a bigger dot for a darker cell than a lighter one', () => {
    // Two cells side by side: left is black, right is mid-gray.
    const data = new Uint8ClampedArray(20 * 10 * 4)
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 20; x++) {
        const i = (y * 20 + x) * 4
        const value = x < 10 ? 0 : 160
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = 255
      }
    }
    applyHalftone(data, 20, 10, { cellSize: 10, dotColor: '#000000', background: '#ffffff' }, 0)

    function dotPixelCount(startX: number): number {
      let count = 0
      for (let y = 0; y < 10; y++) {
        for (let x = startX; x < startX + 10; x++) {
          const i = (y * 20 + x) * 4
          if (data[i] === 0) count++
        }
      }
      return count
    }
    expect(dotPixelCount(0)).toBeGreaterThan(dotPixelCount(10))
  })

  it('handles a partial cell at the image edge without throwing', () => {
    const data = makeFlatImage(15, 7, 100)
    expect(() => applyHalftone(data, 15, 7, { cellSize: 10 }, 0)).not.toThrow()
  })
})
