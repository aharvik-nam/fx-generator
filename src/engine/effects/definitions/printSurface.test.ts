import { describe, expect, it } from 'vitest'
import { applyPrintSurface, applyPrintToneCurve, getSurfaceCharacter } from './printSurface'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

/** paperTextureScale is scaled by canvas resolution (see resolutionScale.ts) — this converts a
 * desired *effective* pixel scale back into the raw param value that produces it at this test
 * canvas's (tiny, non-reference) size. */
function rawFor(effectivePx: number, width: number, height: number): number {
  return effectivePx / resolutionScaleFactor(width, height)
}

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

describe('applyPrintToneCurve', () => {
  it('is the identity curve at blackLift 0 and highlightRolloff 0', () => {
    expect(applyPrintToneCurve(0, 0, 0, 0.6)).toBe(0)
    expect(applyPrintToneCurve(0.5, 0, 0, 0.6)).toBe(0.5)
    expect(applyPrintToneCurve(1, 0, 0, 0.6)).toBe(1)
  })

  it('raises the black point by blackLift', () => {
    expect(applyPrintToneCurve(0, 0.1, 0, 0.6)).toBeCloseTo(0.1)
  })

  it('leaves values below the shoulder untouched by rolloff', () => {
    expect(applyPrintToneCurve(0.3, 0, 0.8, 0.6)).toBeCloseTo(0.3)
  })

  it('compresses values above the shoulder toward, but never reaching, white', () => {
    const compressed = applyPrintToneCurve(1, 0, 0.8, 0.6)
    expect(compressed).toBeLessThan(1)
    expect(compressed).toBeGreaterThan(0.6)
  })

  it('is continuous at the shoulder boundary (no visible seam)', () => {
    const justBelow = applyPrintToneCurve(0.5999, 0, 0.5, 0.6)
    const atShoulder = applyPrintToneCurve(0.6, 0, 0.5, 0.6)
    expect(Math.abs(justBelow - atShoulder)).toBeLessThan(0.001)
  })

  it('compresses more strongly as highlightRolloff increases', () => {
    const mild = applyPrintToneCurve(1, 0, 0.2, 0.6)
    const strong = applyPrintToneCurve(1, 0, 0.9, 0.6)
    expect(strong).toBeLessThan(mild)
  })

  it('is monotonically increasing in the input value', () => {
    const values = [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 1].map((v) =>
      applyPrintToneCurve(v, 0.05, 0.6, 0.6),
    )
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
    }
  })
})

describe('getSurfaceCharacter', () => {
  it('gives matte an earlier shoulder start and coarser mottle than gloss', () => {
    const matte = getSurfaceCharacter('matte')
    const gloss = getSurfaceCharacter('gloss')
    expect(matte.shoulderStart).toBeLessThan(gloss.shoulderStart)
    expect(matte.mottleRadiusMultiplier).toBeGreaterThan(gloss.mottleRadiusMultiplier)
  })

  it('falls back to satin for an unknown profile', () => {
    expect(getSurfaceCharacter('not-a-real-profile')).toEqual(getSurfaceCharacter('satin'))
  })
})

describe('applyPrintSurface', () => {
  it('is a no-op at surfaceAmount 0', () => {
    const data = makeFlatImage(16, 16, 128)
    const before = [...data]
    applyPrintSurface(data, 16, 16, { surfaceAmount: 0 }, 42)
    expect([...data]).toEqual(before)
  })

  it('perturbs a flat midtone image at surfaceAmount > 0', () => {
    const data = makeFlatImage(24, 24, 128)
    applyPrintSurface(data, 24, 24, { surfaceAmount: 0.8, paperTextureScale: 6 }, 42)
    const distinctValues = new Set(data)
    expect(distinctValues.size).toBeGreaterThan(1)
  })

  it('produces an identical result for the same seed', () => {
    const dataA = makeFlatImage(16, 16, 128)
    const dataB = makeFlatImage(16, 16, 128)
    applyPrintSurface(dataA, 16, 16, { surfaceAmount: 0.6 }, 829103)
    applyPrintSurface(dataB, 16, 16, { surfaceAmount: 0.6 }, 829103)
    expect([...dataA]).toEqual([...dataB])
  })

  it('produces a different result for a different seed', () => {
    const dataA = makeFlatImage(16, 16, 128)
    const dataB = makeFlatImage(16, 16, 128)
    applyPrintSurface(dataA, 16, 16, { surfaceAmount: 0.6 }, 1)
    applyPrintSurface(dataB, 16, 16, { surfaceAmount: 0.6 }, 2)
    expect([...dataA]).not.toEqual([...dataB])
  })

  it('lifts a near-black image toward gray when blackLift is high', () => {
    const data = makeFlatImage(16, 16, 2)
    applyPrintSurface(data, 16, 16, { surfaceAmount: 1, blackLift: 0.3, paperWarmth: 0 }, 42)
    let sum = 0
    for (let i = 0; i < data.length; i += 4) sum += data[i]
    const mean = sum / (data.length / 4)
    expect(mean).toBeGreaterThan(2)
  })

  it('shifts a neutral gray warm (red up, blue down) when paperWarmth is high', () => {
    const data = makeFlatImage(16, 16, 128)
    applyPrintSurface(
      data,
      16,
      16,
      {
        surfaceAmount: 1,
        paperWarmth: 1,
        microcontrast: 0,
        blackLift: 0,
        highlightRolloff: 0,
        paperTextureScale: 1,
      },
      42,
    )
    // Average across the image since mottle noise adds per-pixel variance.
    let redSum = 0
    let blueSum = 0
    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i]
      blueSum += data[i + 2]
    }
    expect(redSum).toBeGreaterThan(blueSum)
  })

  it('keeps values within the valid 0-255 range at high settings near the extremes', () => {
    const bright = makeFlatImage(16, 16, 250)
    applyPrintSurface(
      bright,
      16,
      16,
      { surfaceAmount: 1, highlightRolloff: 1, microcontrast: 1 },
      99,
    )
    for (const value of bright) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }

    const dark = makeFlatImage(16, 16, 5)
    applyPrintSurface(dark, 16, 16, { surfaceAmount: 1, blackLift: 0.3, microcontrast: 1 }, 99)
    for (const value of dark) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })

  it('produces visibly different textures across the three profiles for the same seed', () => {
    // A larger effective texture scale than the other tests use, so matte's and gloss's very
    // different mottleRadiusMultiplier still round to distinguishable integer radii once scaled
    // down for this tiny test canvas.
    const rawScale = rawFor(20, 24, 24)

    const matte = makeFlatImage(24, 24, 128)
    applyPrintSurface(
      matte,
      24,
      24,
      { surfaceAmount: 1, profile: 'matte', paperTextureScale: rawScale },
      5,
    )

    const gloss = makeFlatImage(24, 24, 128)
    applyPrintSurface(
      gloss,
      24,
      24,
      { surfaceAmount: 1, profile: 'gloss', paperTextureScale: rawScale },
      5,
    )

    expect([...matte]).not.toEqual([...gloss])
  })
})
