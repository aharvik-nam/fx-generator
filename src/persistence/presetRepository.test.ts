// @vitest-environment node
//
// Same rationale as projectRepository.test.ts/showcaseRepository.test.ts: a Preset is plain
// JSON-serializable data, and fake-indexeddb's structured-clone is reliable under Node.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Preset } from '@/types'
import { deletePreset, listPresets, savePreset } from './presetRepository'

function fakePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: crypto.randomUUID(),
    name: 'My preset',
    effectType: 'exposure',
    params: { stops: 1.5 },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(async () => {
  for (const preset of await listPresets()) await deletePreset(preset.id)
})

describe('presetRepository', () => {
  it('saves and lists presets', async () => {
    await savePreset(fakePreset({ name: 'Warm glow' }))
    const presets = await listPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('Warm glow')
  })

  it('lists presets sorted by name', async () => {
    await savePreset(fakePreset({ id: 'a', name: 'Zebra' }))
    await savePreset(fakePreset({ id: 'b', name: 'Apple' }))
    const presets = await listPresets()
    expect(presets.map((p) => p.name)).toEqual(['Apple', 'Zebra'])
  })

  it('overwrites an existing preset when saved again with the same id', async () => {
    const preset = fakePreset({ name: 'v1' })
    await savePreset(preset)
    await savePreset({ ...preset, name: 'v2' })

    const presets = await listPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('v2')
  })

  it('deletes a preset', async () => {
    const preset = fakePreset()
    await savePreset(preset)
    await deletePreset(preset.id)

    expect(await listPresets()).toHaveLength(0)
  })

  it('preserves params and effectType round-trip', async () => {
    const preset = fakePreset({ effectType: 'duotone', params: { shadowColor: '#112233' } })
    await savePreset(preset)

    const [loaded] = await listPresets()
    expect(loaded.effectType).toBe('duotone')
    expect(loaded.params).toEqual({ shadowColor: '#112233' })
  })
})
