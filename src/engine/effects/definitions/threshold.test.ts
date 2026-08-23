import { describe, expect, it } from 'vitest'
import { applyThreshold } from './threshold'

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

describe('applyThreshold', () => {
  it('maps a bright pixel to the light color', () => {
    const data = makeFlatImage(2, 2, 220)
    applyThreshold(data, 2, 2, { threshold: 50, darkColor: '#000000', lightColor: '#ffffff' }, 0)
    for (let i = 0; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('maps a dark pixel to the dark color', () => {
    const data = makeFlatImage(2, 2, 20)
    applyThreshold(data, 2, 2, { threshold: 50, darkColor: '#000000', lightColor: '#ffffff' }, 0)
    for (let i = 0; i < data.length; i += 4) expect(data[i]).toBe(0)
  })

  it('produces only two distinct output colors across a gradient', () => {
    const data = new Uint8ClampedArray(10 * 1 * 4)
    for (let x = 0; x < 10; x++) {
      const v = x * 28
      data[x * 4] = v
      data[x * 4 + 1] = v
      data[x * 4 + 2] = v
      data[x * 4 + 3] = 255
    }
    applyThreshold(data, 10, 1, { threshold: 50 }, 0)
    const distinct = new Set<number>()
    for (let i = 0; i < data.length; i += 4) distinct.add(data[i])
    expect(distinct.size).toBeLessThanOrEqual(2)
  })

  it('uses custom dark/light colors instead of pure black/white', () => {
    const data = makeFlatImage(1, 1, 220)
    applyThreshold(data, 1, 1, { threshold: 50, darkColor: '#112233', lightColor: '#ffcc00' }, 0)
    expect(data[0]).toBe(0xff)
    expect(data[1]).toBe(0xcc)
    expect(data[2]).toBe(0x00)
  })

  it('moving the threshold changes which side a mid-gray pixel falls on', () => {
    const low = makeFlatImage(1, 1, 128)
    applyThreshold(low, 1, 1, { threshold: 10 }, 0)
    expect(low[0]).toBe(255) // 128/255 luminance (~0.5) is above a 10% threshold -> light

    const high = makeFlatImage(1, 1, 128)
    applyThreshold(high, 1, 1, { threshold: 90 }, 0)
    expect(high[0]).toBe(0) // ...but below a 90% threshold -> dark
  })
})
