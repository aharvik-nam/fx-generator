import { describe, expect, it } from 'vitest'
import { applyExposure } from './exposure'

function makePixel(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a])
}

describe('applyExposure', () => {
  it('leaves the image unchanged at 0 stops', () => {
    const data = makePixel(100, 150, 200)
    applyExposure(data, 1, 1, { stops: 0 }, 0)
    expect([...data]).toEqual([100, 150, 200, 255])
  })

  it('doubles channel values at +1 stop, clamped to 255', () => {
    const data = makePixel(50, 100, 200)
    applyExposure(data, 1, 1, { stops: 1 }, 0)
    expect([...data]).toEqual([100, 200, 255, 255])
  })

  it('halves channel values at -1 stop', () => {
    const data = makePixel(100, 200, 40)
    applyExposure(data, 1, 1, { stops: -1 }, 0)
    expect([...data]).toEqual([50, 100, 20, 255])
  })

  it('preserves the alpha channel', () => {
    const data = makePixel(10, 10, 10, 128)
    applyExposure(data, 1, 1, { stops: 2 }, 0)
    expect(data[3]).toBe(128)
  })
})
