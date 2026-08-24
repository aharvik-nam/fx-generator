import { describe, expect, it } from 'vitest'
import { applyHalation, highlightMaskAt } from './halation'

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

/** A dark field with one bright square in the middle, like a practical light in a night scene. */
function makeSpotlightImage(width: number, height: number): Uint8ClampedArray {
  const data = makeFlatImage(width, height, 15)
  const spotStart = Math.floor(width / 2) - 2
  const spotEnd = Math.floor(width / 2) + 2
  for (let y = spotStart; y < spotEnd; y++) {
    for (let x = spotStart; x < spotEnd; x++) {
      const i = (y * width + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
    }
  }
  return data
}

describe('highlightMaskAt', () => {
  it('is 0 well below the threshold', () => {
    expect(highlightMaskAt(0.2, 0.75, 0.15)).toBe(0)
  })

  it('is close to full luminance well above the threshold', () => {
    expect(highlightMaskAt(1, 0.75, 0.15)).toBeCloseTo(1)
  })

  it('ramps smoothly through the knee instead of jumping', () => {
    const belowKnee = highlightMaskAt(0.59, 0.75, 0.15)
    const atThreshold = highlightMaskAt(0.75, 0.75, 0.15)
    const aboveKnee = highlightMaskAt(0.91, 0.75, 0.15)
    expect(belowKnee).toBe(0)
    expect(atThreshold).toBeGreaterThan(0)
    expect(atThreshold).toBeLessThan(aboveKnee)
  })

  it('weights by luminance, so a dim highlight glows less than a bright one', () => {
    const dim = highlightMaskAt(0.92, 0.75, 0.15)
    const bright = highlightMaskAt(1, 0.75, 0.15)
    expect(bright).toBeGreaterThan(dim)
  })
})

describe('applyHalation', () => {
  it('is a no-op at amount 0', () => {
    const data = makeSpotlightImage(24, 24)
    const before = [...data]
    applyHalation(data, 24, 24, { amount: 0, radius: 10 }, 0)
    expect([...data]).toEqual(before)
  })

  it('leaves a fully dark image untouched (nothing crosses the highlight threshold)', () => {
    const data = makeFlatImage(16, 16, 10)
    const before = [...data]
    applyHalation(data, 16, 16, { amount: 0.8, radius: 10, threshold: 0.75 }, 0)
    expect([...data]).toEqual(before)
  })

  it('brightens pixels near a highlight but leaves pixels far away untouched', () => {
    const data = makeSpotlightImage(40, 40)
    const before = [...data]
    applyHalation(data, 40, 40, { amount: 0.8, radius: 8, threshold: 0.6 }, 0)

    // Just outside the spotlight square should have gained some glow.
    const nearIndex = (20 * 40 + 22) * 4
    expect(data[nearIndex]).toBeGreaterThan(before[nearIndex])

    // A far corner, many radii away, should be unaffected.
    const farIndex = (1 * 40 + 1) * 4
    expect(data[farIndex]).toBe(before[farIndex])
  })

  it('tints the glow toward the requested hue rather than copying the highlight color', () => {
    const data = makeSpotlightImage(30, 30)
    applyHalation(data, 30, 30, { amount: 1, radius: 10, threshold: 0.6, hue: 0, saturation: 1 }, 0)
    // Just outside the (white) spotlight, a red-hued glow should push red above green/blue.
    const i = (15 * 30 + 19) * 4
    expect(data[i]).toBeGreaterThan(data[i + 2])
  })

  it('keeps values within the valid 0-255 range at high amount', () => {
    const data = makeSpotlightImage(24, 24)
    applyHalation(data, 24, 24, { amount: 1, radius: 12, threshold: 0.5 }, 0)
    for (const value of data) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })

  it('spreads glow further from the source at a larger radius', () => {
    const small = makeSpotlightImage(50, 50)
    applyHalation(small, 50, 50, { amount: 0.8, radius: 4, threshold: 0.6 }, 0)

    const large = makeSpotlightImage(50, 50)
    applyHalation(large, 50, 50, { amount: 0.8, radius: 20, threshold: 0.6 }, 0)

    // A point well outside the spotlight should glow more under the larger radius.
    const i = (25 * 50 + 32) * 4
    expect(large[i]).toBeGreaterThan(small[i])
  })

  it('keeps the glow closer to strong edges when edgePreservation is high', () => {
    const contained = makeSpotlightImage(50, 50)
    applyHalation(
      contained,
      50,
      50,
      {
        amount: 0.8,
        radius: 16,
        threshold: 0.6,
        edgePreservation: 1,
      },
      0,
    )

    const spread = makeSpotlightImage(50, 50)
    applyHalation(
      spread,
      50,
      50,
      {
        amount: 0.8,
        radius: 16,
        threshold: 0.6,
        edgePreservation: 0,
      },
      0,
    )

    // Just past the spotlight's sharp edge, low edge-preservation (closer to a generic bloom)
    // should let more glow through than high edge-preservation.
    const i = (25 * 50 + 30) * 4
    expect(spread[i]).toBeGreaterThanOrEqual(contained[i])
  })
})
