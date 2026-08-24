import { create } from 'zustand'
import type { EffectChainPreset, EffectNode } from '@/types'
import {
  deleteChainPreset as removeChainPreset,
  listChainPresets,
  saveChainPreset as persistChainPreset,
} from '@/persistence/chainPresetRepository'

type ChainPresetStore = {
  chainPresets: EffectChainPreset[]
  isLoaded: boolean

  loadChainPresets: () => Promise<void>
  saveAsChainPreset: (name: string, effects: EffectNode[]) => Promise<void>
  deleteChainPreset: (id: string) => Promise<void>
}

export const useChainPresetStore = create<ChainPresetStore>((set, get) => ({
  chainPresets: [],
  isLoaded: false,

  loadChainPresets: async () => {
    if (get().isLoaded) return
    try {
      const chainPresets = await listChainPresets()
      set({ chainPresets, isLoaded: true })
    } catch {
      // Same degrade-gracefully rationale as presetStore: IndexedDB can be unavailable.
      set({ isLoaded: true })
    }
  },

  saveAsChainPreset: async (name, effects) => {
    const preset: EffectChainPreset = {
      id: crypto.randomUUID(),
      name,
      effects: structuredClone(effects),
      createdAt: new Date().toISOString(),
    }
    await persistChainPreset(preset)
    const chainPresets = [...get().chainPresets, preset].toSorted((a, b) =>
      a.name.localeCompare(b.name),
    )
    set({ chainPresets })
  },

  deleteChainPreset: async (id) => {
    await removeChainPreset(id)
    set({ chainPresets: get().chainPresets.filter((preset) => preset.id !== id) })
  },
}))
