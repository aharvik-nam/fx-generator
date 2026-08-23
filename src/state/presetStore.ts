import { create } from 'zustand'
import type { EffectParams, Preset } from '@/types'
import {
  deletePreset as removePreset,
  listPresets,
  savePreset as persistPreset,
} from '@/persistence/presetRepository'

type PresetStore = {
  presets: Preset[]
  isLoaded: boolean

  loadPresets: () => Promise<void>
  saveAsPreset: (name: string, effectType: string, params: EffectParams) => Promise<void>
  deletePreset: (id: string) => Promise<void>
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  isLoaded: false,

  loadPresets: async () => {
    if (get().isLoaded) return
    try {
      const presets = await listPresets()
      set({ presets, isLoaded: true })
    } catch {
      // IndexedDB can be unavailable (private browsing restrictions, storage errors, ...).
      // Presets are a convenience layer, not a required feature — degrade to an empty list
      // rather than leaving an unhandled rejection or blocking the rest of the editor.
      set({ isLoaded: true })
    }
  },

  saveAsPreset: async (name, effectType, params) => {
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      effectType,
      params: structuredClone(params),
      createdAt: new Date().toISOString(),
    }
    await persistPreset(preset)
    const presets = [...get().presets, preset].toSorted((a, b) => a.name.localeCompare(b.name))
    set({ presets })
  },

  deletePreset: async (id) => {
    await removePreset(id)
    set({ presets: get().presets.filter((preset) => preset.id !== id) })
  },
}))
