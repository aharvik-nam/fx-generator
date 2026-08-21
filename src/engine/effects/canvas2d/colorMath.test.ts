import { describe, expect, it } from 'vitest'
import { clamp8, hexToRgb, relativeLuminance } from './colorMath'

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
