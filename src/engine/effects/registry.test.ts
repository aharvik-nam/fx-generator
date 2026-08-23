import { describe, expect, it } from 'vitest'
import {
  createEffectNode,
  defaultParamsFor,
  getEffectDefinition,
  listEffectDefinitions,
} from './registry'

describe('effect registry', () => {
  it('lists all 9 Priority-1 effect definitions plus post-MVP Priority-2 additions', () => {
    const ids = listEffectDefinitions().map((d) => d.id)
    expect(ids).toEqual([
      'exposure',
      'contrast',
      'duotone',
      'film-grain',
      'vignette',
      'posterize',
      'rgb-channel-shift',
      'pixelation',
      'ordered-dithering',
      'halftone',
      'pixel-sort',
      'outline',
      'threshold',
    ])
  })

  it('throws a clear error for an unknown effect type', () => {
    expect(() => getEffectDefinition('does-not-exist')).toThrow(/does-not-exist/)
  })

  it('builds default params matching the paramSchema defaults', () => {
    expect(defaultParamsFor('exposure')).toEqual({ stops: 0 })
    expect(defaultParamsFor('film-grain')).toEqual({ amount: 0.15, size: 1 })
  })

  it('creates a node with a unique id, default params, and no blend/opacity surprises', () => {
    const node = createEffectNode('contrast')
    expect(node.type).toBe('contrast')
    expect(node.name).toBe('Contrast')
    expect(node.enabled).toBe(true)
    expect(node.opacity).toBe(1)
    expect(node.blendMode).toBe('normal')
    expect(node.params).toEqual({ amount: 0 })
    expect(node.seed).toBeUndefined()
    expect(node.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('assigns a random seed only to effects that use one', () => {
    const grain = createEffectNode('film-grain')
    expect(typeof grain.seed).toBe('number')

    const exposure = createEffectNode('exposure')
    expect(exposure.seed).toBeUndefined()
  })

  it('assigns distinct ids and seeds across multiple nodes of the same type', () => {
    const a = createEffectNode('film-grain')
    const b = createEffectNode('film-grain')
    expect(a.id).not.toBe(b.id)
    expect(a.seed).not.toBe(b.seed)
  })

  it('uses paramsOverride instead of defaults when provided (e.g. applying a preset)', () => {
    const node = createEffectNode('exposure', { stops: 2.5 })
    expect(node.params).toEqual({ stops: 2.5 })
  })
})
