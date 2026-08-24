import { describe, expect, it } from 'vitest'
import { clamp8, hexToRgb, hslToRgb, relativeLuminance } from './colorMath'

describe('clamp8', () => {
  it('clamps below 0 and above 255', () => {
    expect(clamp8(-10)).toBe(0)
    expect(clamp8(300)).toBe(255)
    expect(clamp8(128)).toBe(128)
  })
})

describe('hexToRgb', () => {
  it('parses 6-digit hex colors', () => {
    expect(hexToRgb('#f4d06f')).toEqual({ r: 244, g: 208, b: 111 })
  })

  it('parses 3-digit shorthand hex colors', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('falls back to black for invalid input', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('relativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1)
  })
})

describe('hslToRgb', () => {
  it('produces black at lightness 0 and white at lightness 1, regardless of hue/saturation', () => {
    expect(hslToRgb(120, 0.8, 0)).toEqual({ r: 0, g: 0, b: 0 })
    const white = hslToRgb(200, 0.5, 1)
    expect(white.r).toBeCloseTo(255)
    expect(white.g).toBeCloseTo(255)
    expect(white.b).toBeCloseTo(255)
  })

  it('produces gray at saturation 0, regardless of hue', () => {
    const gray = hslToRgb(0, 0, 0.5)
    expect(gray.r).toBeCloseTo(gray.g)
    expect(gray.g).toBeCloseTo(gray.b)
  })

  it('produces pure red at hue 0, full saturation, mid lightness', () => {
    const red = hslToRgb(0, 1, 0.5)
    expect(red.r).toBeCloseTo(255)
    expect(red.g).toBeCloseTo(0)
    expect(red.b).toBeCloseTo(0)
  })

  it('produces pure green at hue 120 and pure blue at hue 240', () => {
    const green = hslToRgb(120, 1, 0.5)
    expect(green.r).toBeCloseTo(0)
    expect(green.g).toBeCloseTo(255)
    expect(green.b).toBeCloseTo(0)

    const blue = hslToRgb(240, 1, 0.5)
    expect(blue.r).toBeCloseTo(0)
    expect(blue.g).toBeCloseTo(0)
    expect(blue.b).toBeCloseTo(255)
  })

  it('wraps hue values outside 0-360', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual(hslToRgb(360, 1, 0.5))
    expect(hslToRgb(-10, 1, 0.5).r).toBeCloseTo(hslToRgb(350, 1, 0.5).r)
  })
})
