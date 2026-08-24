// @vitest-environment node
//
// Same rationale as presetRepository.test.ts: an EffectChainPreset is plain JSON-serializable
// data, and fake-indexeddb's structured-clone is reliable under Node.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { EffectChainPreset, EffectNode } from '@/types'
import { deleteChainPreset, listChainPresets, saveChainPreset } from './chainPresetRepository'

function fakeEffect(overrides: Partial<EffectNode> = {}): EffectNode {
  return {
    id: crypto.randomUUID(),
    type: 'exposure',
    name: 'Exposure',
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    params: { stops: 1.5 },
    ...overrides,
  }
}

function fakeChainPreset(overrides: Partial<EffectChainPreset> = {}): EffectChainPreset {
  return {
    id: crypto.randomUUID(),
    name: 'My chain',
    effects: [fakeEffect()],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(async () => {
  for (const preset of await listChainPresets()) await deleteChainPreset(preset.id)
})

describe('chainPresetRepository', () => {
  it('saves and lists chain presets', async () => {
    await saveChainPreset(fakeChainPreset({ name: 'Vintage film' }))
    const presets = await listChainPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('Vintage film')
  })

  it('lists chain presets sorted by name', async () => {
    await saveChainPreset(fakeChainPreset({ id: 'a', name: 'Zebra' }))
    await saveChainPreset(fakeChainPreset({ id: 'b', name: 'Apple' }))
    const presets = await listChainPresets()
    expect(presets.map((p) => p.name)).toEqual(['Apple', 'Zebra'])
  })

  it('overwrites an existing chain preset when saved again with the same id', async () => {
    const preset = fakeChainPreset({ name: 'v1' })
    await saveChainPreset(preset)
    await saveChainPreset({ ...preset, name: 'v2' })

    const presets = await listChainPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('v2')
  })

  it('deletes a chain preset', async () => {
    const preset = fakeChainPreset()
    await saveChainPreset(preset)
    await deleteChainPreset(preset.id)

    expect(await listChainPresets()).toHaveLength(0)
  })

  it('preserves the full effect list round-trip', async () => {
    const preset = fakeChainPreset({
      effects: [
        fakeEffect({ type: 'duotone', opacity: 0.5, blendMode: 'multiply' }),
        fakeEffect({ type: 'film-grain', seed: 42 }),
      ],
    })
    await saveChainPreset(preset)

    const [loaded] = await listChainPresets()
    expect(loaded.effects).toHaveLength(2)
    expect(loaded.effects[0]).toMatchObject({
      type: 'duotone',
      opacity: 0.5,
      blendMode: 'multiply',
    })
    expect(loaded.effects[1]).toMatchObject({ type: 'film-grain', seed: 42 })
  })
})
