import { describe, expect, it } from 'vitest'
import { maskValueAt } from './maskMath'

describe('maskValueAt', () => {
  it('always returns 1 for kind: none', () => {
    expect(maskValueAt(0, 0, { kind: 'none' })).toBe(1)
    expect(maskValueAt(0.5, 0.9, { kind: 'none' })).toBe(1)
  })

  it('always returns 1 for kind: bitmap (not yet implemented)', () => {
    expect(maskValueAt(0.5, 0.5, { kind: 'bitmap', assetId: 'a', invert: false })).toBe(1)
  })

  describe('linear-gradient', () => {
    it('fades left (1) to right (0) at angle 0 with full feather', () => {
      const mask = { kind: 'linear-gradient' as const, angle: 0, feather: 1 }
      expect(maskValueAt(0, 0.5, mask)).toBeCloseTo(1, 1)
      expect(maskValueAt(1, 0.5, mask)).toBeCloseTo(0, 1)
      expect(maskValueAt(0.5, 0.5, mask)).toBeCloseTo(0.5, 5)
    })

    it('fades top (1) to bottom (0) at angle 90', () => {
      const mask = { kind: 'linear-gradient' as const, angle: 90, feather: 1 }
      expect(maskValueAt(0.5, 0, mask)).toBeCloseTo(1, 1)
      expect(maskValueAt(0.5, 1, mask)).toBeCloseTo(0, 1)
    })

    it('approaches a hard step at the midpoint as feather approaches 0', () => {
      const mask = { kind: 'linear-gradient' as const, angle: 0, feather: 0.001 }
      expect(maskValueAt(0.4, 0.5, mask)).toBeCloseTo(1, 5)
      expect(maskValueAt(0.6, 0.5, mask)).toBeCloseTo(0, 5)
    })

    it('clamps outside the transition band instead of extrapolating past 0/1', () => {
      const mask = { kind: 'linear-gradient' as const, angle: 0, feather: 0.1 }
      expect(maskValueAt(0, 0.5, mask)).toBe(1)
      expect(maskValueAt(1, 0.5, mask)).toBe(0)
    })
  })

  describe('radial-gradient', () => {
    it('is fully visible inside the inner radius (feather 0 = hard edge)', () => {
      const mask = {
        kind: 'radial-gradient' as const,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        feather: 0,
      }
      expect(maskValueAt(0.5, 0.5, mask)).toBe(1)
    })

    it('is fully hidden beyond the radius', () => {
      const mask = {
        kind: 'radial-gradient' as const,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        feather: 0,
      }
      expect(maskValueAt(0.5, 0.9, mask)).toBe(0)
    })

    it('interpolates within the feathered band', () => {
      const mask = {
        kind: 'radial-gradient' as const,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.4,
        feather: 1,
      }
      // At the center, full feather band means value 1; at the edge, value 0.
      expect(maskValueAt(0.5, 0.5, mask)).toBeCloseTo(1, 5)
      expect(maskValueAt(0.5, 0.9, mask)).toBeCloseTo(0, 5)
      const mid = maskValueAt(0.5, 0.7, mask)
      expect(mid).toBeGreaterThan(0)
      expect(mid).toBeLessThan(1)
    })
  })

  describe('luminosity', () => {
    it('returns the base color luminance as the mask value', () => {
      const mask = { kind: 'luminosity' as const, invert: false }
      expect(maskValueAt(0, 0, mask, { r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
      expect(maskValueAt(0, 0, mask, { r: 0, g: 0, b: 0 })).toBe(0)
    })

    it('inverts the luminance when invert is true', () => {
      const mask = { kind: 'luminosity' as const, invert: true }
      expect(maskValueAt(0, 0, mask, { r: 255, g: 255, b: 255 })).toBeCloseTo(0, 5)
      expect(maskValueAt(0, 0, mask, { r: 0, g: 0, b: 0 })).toBe(1)
    })

    it('treats a missing base color as black', () => {
      expect(maskValueAt(0, 0, { kind: 'luminosity', invert: false })).toBe(0)
      expect(maskValueAt(0, 0, { kind: 'luminosity', invert: true })).toBe(1)
    })
  })
})
