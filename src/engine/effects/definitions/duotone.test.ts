import { describe, expect, it } from 'vitest'
import { applyDuotone } from './duotone'

function makePixel(r: number, g: number, b: number): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, 255])
}

describe('applyDuotone', () => {
  const shadowColor = '#102030'
  const highlightColor = '#f4d06f'

  it('maps black (luminance 0) to the shadow color', () => {
    const data = makePixel(0, 0, 0)
    applyDuotone(data, 1, 1, { shadowColor, highlightColor }, 0)
    expect(Array.from(data.slice(0, 3))).toEqual([0x10, 0x20, 0x30])
  })

  it('maps white (luminance 1) to the highlight color', () => {
    const data = makePixel(255, 255, 255)
    applyDuotone(data, 1, 1, { shadowColor, highlightColor }, 0)
    expect(Array.from(data.slice(0, 3))).toEqual([0xf4, 0xd0, 0x6f])
  })

  it('produces a value between shadow and highlight for mid luminance', () => {
    const data = makePixel(128, 128, 128)
    applyDuotone(data, 1, 1, { shadowColor, highlightColor }, 0)
    expect(data[0]).toBeGreaterThan(0x10)
    expect(data[0]).toBeLessThan(0xf4)
  })
})
