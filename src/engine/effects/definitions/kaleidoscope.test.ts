import { describe, expect, it } from 'vitest'
import { kaleidoscopeSource } from './kaleidoscope'

describe('kaleidoscopeSource', () => {
  it('maps the center pixel to itself regardless of segments or rotation', () => {
    const { srcX, srcY } = kaleidoscopeSource(50, 50, 100, 100, 6, 0.5, 0.5, 0)
    expect(srcX).toBeCloseTo(50)
    expect(srcY).toBeCloseTo(50)
  })

  it('is periodic across wedge boundaries (angle θ and θ + wedge give the same source point)', () => {
    const width = 100
    const height = 100
    const segments = 4
    const wedge = (Math.PI * 2) / segments
    const cx = 50
    const cy = 50
    const r = 20
    const angle = 0.3

    const p1 = kaleidoscopeSource(
      cx + r * Math.cos(angle),
      cy + r * Math.sin(angle),
      width,
      height,
      segments,
      0.5,
      0.5,
      0,
    )
    const p2 = kaleidoscopeSource(
      cx + r * Math.cos(angle + wedge),
      cy + r * Math.sin(angle + wedge),
      width,
      height,
      segments,
      0.5,
      0.5,
      0,
    )
    expect(p2.srcX).toBeCloseTo(p1.srcX)
    expect(p2.srcY).toBeCloseTo(p1.srcY)
  })

  it('mirrors symmetrically within a wedge (angle θ and wedge - θ give the same source point)', () => {
    const width = 100
    const height = 100
    const segments = 6
    const wedge = (Math.PI * 2) / segments
    const cx = 50
    const cy = 50
    const r = 15
    const angle = 0.2 * wedge

    const p1 = kaleidoscopeSource(
      cx + r * Math.cos(angle),
      cy + r * Math.sin(angle),
      width,
      height,
      segments,
      0.5,
      0.5,
      0,
    )
    const p2 = kaleidoscopeSource(
      cx + r * Math.cos(wedge - angle),
      cy + r * Math.sin(wedge - angle),
      width,
      height,
      segments,
      0.5,
      0.5,
      0,
    )
    expect(p2.srcX).toBeCloseTo(p1.srcX)
    expect(p2.srcY).toBeCloseTo(p1.srcY)
  })

  it('is periodic in rotation with period equal to one wedge', () => {
    const segments = 5
    const wedge = (Math.PI * 2) / segments
    const a = kaleidoscopeSource(70, 35, 100, 100, segments, 0.5, 0.5, 0)
    const b = kaleidoscopeSource(70, 35, 100, 100, segments, 0.5, 0.5, wedge)
    expect(b.srcX).toBeCloseTo(a.srcX)
    expect(b.srcY).toBeCloseTo(a.srcY)
  })

  it('stays finite with a single segment', () => {
    const { srcX, srcY } = kaleidoscopeSource(80, 20, 100, 100, 1, 0.5, 0.5, 0)
    expect(Number.isFinite(srcX)).toBe(true)
    expect(Number.isFinite(srcY)).toBe(true)
  })
})
