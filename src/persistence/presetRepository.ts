import type { Preset } from '@/types'
import { getDb } from './db'

export async function savePreset(preset: Preset): Promise<void> {
  const db = await getDb()
  await db.put('presets', preset)
}

export async function listPresets(): Promise<Preset[]> {
  const db = await getDb()
  const presets = await db.getAll('presets')
  return presets.toSorted((a, b) => a.name.localeCompare(b.name))
}

export async function deletePreset(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('presets', id)
}
