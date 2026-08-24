import type { EffectChainPreset } from '@/types'
import { getDb } from './db'

export async function saveChainPreset(preset: EffectChainPreset): Promise<void> {
  const db = await getDb()
  await db.put('chainPresets', preset)
}

export async function listChainPresets(): Promise<EffectChainPreset[]> {
  const db = await getDb()
  const presets = await db.getAll('chainPresets')
  return presets.toSorted((a, b) => a.name.localeCompare(b.name))
}

export async function deleteChainPreset(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('chainPresets', id)
}
