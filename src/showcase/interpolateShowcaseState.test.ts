import { describe, expect, it } from 'vitest'
import type { EffectNode, ShowcaseState } from '@/types'
import { interpolateShowcaseState } from './interpolateShowcaseState'

function fakeState(overrides: Partial<ShowcaseState> = {}): ShowcaseState {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'State',
    effectNodes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function exposureNode(overrides: Partial<EffectNode> = {}): EffectNode {
  return {
    id: 'exposure-1',
    type: 'exposure',
    name: 'Exposure',
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    params: { stops: 0 },
    ...overrides,
  }
}

function duotoneNode(overrides: Partial<EffectNode> = {}): EffectNode {
  return {
    id: 'duotone-1',
    type: 'duotone',
    name: 'Duotone',
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    params: { shadowColor: '#000000', highlightColor: '#000000' },
    ...overrides,
  }
}

describe('interpolateShowcaseState', () => {
  it('lerps numeric (slider) params', () => {
    const from = fakeState({ effectNodes: [exposureNode({ params: { stops: 0 } })] })
    const to = fakeState({ effectNodes: [exposureNode({ params: { stops: 2 } })] })

    expect(interpolateShowcaseState(from, to, 0).effects[0].params.stops).toBe(0)
    expect(interpolateShowcaseState(from, to, 0.5).effects[0].params.stops).toBe(1)
    expect(interpolateShowcaseState(from, to, 1).effects[0].params.stops).toBe(2)
  })

  it('lerps color params in RGB space', () => {
    const from = fakeState({
      effectNodes: [duotoneNode({ params: { shadowColor: '#000000', highlightColor: '#000000' } })],
    })
    const to = fakeState({
      effectNodes: [duotoneNode({ params: { shadowColor: '#ffffff', highlightColor: '#000000' } })],
    })

    const mid = interpolateShowcaseState(from, to, 0.5)
    expect(mid.effects[0].params.shadowColor).toBe('#808080')
  })

  it('snaps unknown/non-numeric params at the progress midpoint instead of lerping', () => {
    const from = fakeState({ effectNodes: [exposureNode({ params: { stops: 0, mode: 'a' } })] })
    const to = fakeState({ effectNodes: [exposureNode({ params: { stops: 0, mode: 'b' } })] })

    expect(interpolateShowcaseState(from, to, 0.49).effects[0].params.mode).toBe('a')
    expect(interpolateShowcaseState(from, to, 0.5).effects[0].params.mode).toBe('b')
  })

  it('snaps enabled, blendMode, and seed at the progress midpoint', () => {
    const from = fakeState({
      effectNodes: [exposureNode({ enabled: false, blendMode: 'normal', seed: 1 })],
    })
    const to = fakeState({
      effectNodes: [exposureNode({ enabled: true, blendMode: 'multiply', seed: 2 })],
    })

    const before = interpolateShowcaseState(from, to, 0.4).effects[0]
    expect(before.enabled).toBe(false)
    expect(before.blendMode).toBe('normal')
    expect(before.seed).toBe(1)

    const after = interpolateShowcaseState(from, to, 0.6).effects[0]
    expect(after.enabled).toBe(true)
    expect(after.blendMode).toBe('multiply')
    expect(after.seed).toBe(2)
  })

  it('lerps opacity linearly for a node present in both states', () => {
    const from = fakeState({ effectNodes: [exposureNode({ opacity: 0.2 })] })
    const to = fakeState({ effectNodes: [exposureNode({ opacity: 1 })] })

    expect(interpolateShowcaseState(from, to, 0.5).effects[0].opacity).toBeCloseTo(0.6)
  })

  it('fades out a node that only exists in the "from" state', () => {
    const from = fakeState({ effectNodes: [exposureNode({ opacity: 1 })] })
    const to = fakeState({ effectNodes: [] })

    expect(interpolateShowcaseState(from, to, 0).effects[0].opacity).toBe(1)
    expect(interpolateShowcaseState(from, to, 0.5).effects[0].opacity).toBeCloseTo(0.5)
    expect(interpolateShowcaseState(from, to, 1).effects[0].opacity).toBe(0)
  })

  it('fades in a node that only exists in the "to" state', () => {
    const from = fakeState({ effectNodes: [] })
    const to = fakeState({ effectNodes: [exposureNode({ opacity: 1 })] })

    expect(interpolateShowcaseState(from, to, 0).effects[0].opacity).toBe(0)
    expect(interpolateShowcaseState(from, to, 0.5).effects[0].opacity).toBeCloseTo(0.5)
    expect(interpolateShowcaseState(from, to, 1).effects[0].opacity).toBe(1)
  })

  it('matches effects by stable id, not array position', () => {
    const from = fakeState({
      effectNodes: [duotoneNode({ id: 'a' }), exposureNode({ id: 'b', params: { stops: 0 } })],
    })
    const to = fakeState({
      effectNodes: [exposureNode({ id: 'b', params: { stops: 2 } }), duotoneNode({ id: 'a' })],
    })

    const result = interpolateShowcaseState(from, to, 0.5)
    expect(result.effects).toHaveLength(2)
    const exposureResult = result.effects.find((effect) => effect.id === 'b')
    expect(exposureResult?.params.stops).toBe(1)
  })

  it('lerps camera zoom/pan', () => {
    const from = fakeState({ camera: { zoom: 1, panX: 0, panY: 0 } })
    const to = fakeState({ camera: { zoom: 2, panX: 100, panY: -50 } })

    const mid = interpolateShowcaseState(from, to, 0.5)
    expect(mid.camera).toEqual({ zoom: 1.5, panX: 50, panY: -25 })
  })

  it('falls back to the default camera when a state has none', () => {
    const from = fakeState({ camera: undefined })
    const to = fakeState({ camera: { zoom: 2, panX: 0, panY: 0 } })

    expect(interpolateShowcaseState(from, to, 0).camera).toEqual({ zoom: 1, panX: 0, panY: 0 })
  })

  it('clamps progress outside [0, 1]', () => {
    const from = fakeState({ effectNodes: [exposureNode({ params: { stops: 0 } })] })
    const to = fakeState({ effectNodes: [exposureNode({ params: { stops: 2 } })] })

    expect(interpolateShowcaseState(from, to, -1).effects[0].params.stops).toBe(0)
    expect(interpolateShowcaseState(from, to, 5).effects[0].params.stops).toBe(2)
  })
})
