import { describe, expect, it } from 'vitest'
import { applyAnalogGrain, getGrainLookProfile, tonalGrainWeight } from './analogGrain'

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

/** A checkerboard has maximal local detail everywhere, unlike a flat image. */
function makeCheckerboard(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = (x + y) % 2 === 0 ? 20 : 235
      const i = (y * width + x) * 4
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return data
}

describe('applyAnalogGrain', () => {
  it('is a no-op at amount 0', () => {
    const data = makeFlatImage(8, 8, 128)
    const before = [...data]
    applyAnalogGrain(data, 8, 8, { amount: 0, size: 2, look: 'classic-400' }, 42)
    expect([...data]).toEqual(before)
  })

  it('is a no-op at amount 0 for a color-variance look too', () => {
    const data = makeFlatImage(8, 8, 128)
    const before = [...data]
    applyAnalogGrain(data, 8, 8, { amount: 0, size: 2, look: 'color-negative' }, 42)
    expect([...data]).toEqual(before)
  })

  it('produces an identical result for the same seed', () => {
    const dataA = makeFlatImage(16, 16, 128)
    const dataB = makeFlatImage(16, 16, 128)
    applyAnalogGrain(dataA, 16, 16, { amount: 0.5, size: 2 }, 829103)
    applyAnalogGrain(dataB, 16, 16, { amount: 0.5, size: 2 }, 829103)
    expect([...dataA]).toEqual([...dataB])
  })

  it('produces a different result for a different seed', () => {
    const dataA = makeFlatImage(16, 16, 128)
    const dataB = makeFlatImage(16, 16, 128)
    applyAnalogGrain(dataA, 16, 16, { amount: 0.5, size: 2 }, 1)
    applyAnalogGrain(dataB, 16, 16, { amount: 0.5, size: 2 }, 2)
    expect([...dataA]).not.toEqual([...dataB])
  })

  it('actually perturbs a flat midtone image at amount > 0', () => {
    const data = makeFlatImage(16, 16, 128)
    applyAnalogGrain(data, 16, 16, { amount: 0.8, size: 2, look: 'pushed-bw' }, 7)
    const distinctValues = new Set(data)
    expect(distinctValues.size).toBeGreaterThan(1)
  })

  it('keeps values within the valid 0-255 range at high amount near the extremes', () => {
    const bright = makeFlatImage(16, 16, 250)
    applyAnalogGrain(bright, 16, 16, { amount: 1, size: 4, look: 'pushed-bw' }, 99)
    for (const value of bright) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }

    const dark = makeFlatImage(16, 16, 5)
    applyAnalogGrain(dark, 16, 16, { amount: 1, size: 4, look: 'pushed-bw' }, 99)
    for (const value of dark) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }
  })

  it('adds independent per-channel variation only for looks with colorVariance > 0', () => {
    const monochromeLook = makeFlatImage(16, 16, 128)
    applyAnalogGrain(monochromeLook, 16, 16, { amount: 0.8, size: 2, look: 'classic-400' }, 42)
    for (let i = 0; i < monochromeLook.length; i += 4) {
      expect(monochromeLook[i]).toBe(monochromeLook[i + 1])
      expect(monochromeLook[i + 1]).toBe(monochromeLook[i + 2])
    }

    // Large enough that the color-noise field's blur radius doesn't flatten it into a
    // near-constant value across the whole image (this look's variation is intentionally subtle).
    const colorLook = makeFlatImage(64, 64, 128)
    applyAnalogGrain(colorLook, 64, 64, { amount: 1, size: 2, look: 'color-negative' }, 42)
    let anyChannelDiffers = false
    for (let i = 0; i < colorLook.length; i += 4) {
      if (colorLook[i] !== colorLook[i + 2]) anyChannelDiffers = true
    }
    expect(anyChannelDiffers).toBe(true)
  })

  it('suppresses grain more in high-detail regions than in flat regions', () => {
    const flat = makeFlatImage(24, 24, 128)
    applyAnalogGrain(flat, 24, 24, { amount: 0.8, size: 2, look: 'pushed-bw' }, 42)
    const flatVariance = variance(flat)

    const checker = makeCheckerboard(24, 24)
    const checkerBefore = [...checker]
    applyAnalogGrain(checker, 24, 24, { amount: 0.8, size: 2, look: 'pushed-bw' }, 42)
    const checkerGrainOnly = checker.map((v, i) => v - checkerBefore[i])

    // The grain-only delta (not the checkerboard pattern itself) should vary less than the
    // full grain applied to a flat image, since detail suppression dampens it near every edge.
    expect(variance(checkerGrainOnly)).toBeLessThan(flatVariance)
  })
})

function variance(data: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]
  const mean = sum / data.length
  let sqDiff = 0
  for (let i = 0; i < data.length; i++) sqDiff += (data[i] - mean) ** 2
  return sqDiff / data.length
}

describe('getGrainLookProfile', () => {
  it('returns distinct profiles for each look', () => {
    const fine = getGrainLookProfile('fine-bw')
    const pushed = getGrainLookProfile('pushed-bw')
    expect(fine.baseAmount).toBeLessThan(pushed.baseAmount)
    expect(fine.shadowReach).toBeLessThan(pushed.shadowReach)
  })

  it('falls back to classic-400 for an unknown look', () => {
    expect(getGrainLookProfile('not-a-real-look')).toEqual(getGrainLookProfile('classic-400'))
  })
})

describe('tonalGrainWeight', () => {
  it('is strongest in the midtones and weaker at the extremes', () => {
    const mid = tonalGrainWeight(0.5, 0.6, 0.6)
    const shadow = tonalGrainWeight(0.02, 0.6, 0.6)
    const highlight = tonalGrainWeight(0.98, 0.6, 0.6)
    expect(mid).toBeGreaterThan(shadow)
    expect(mid).toBeGreaterThan(highlight)
  })

  it('reaches further into shadows when shadowReach is higher', () => {
    const lowReach = tonalGrainWeight(0.1, 0.2, 0.6)
    const highReach = tonalGrainWeight(0.1, 0.9, 0.6)
    expect(highReach).toBeGreaterThan(lowReach)
  })
})
