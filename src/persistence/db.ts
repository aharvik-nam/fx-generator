import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { EffectChainPreset, ImageProject, Preset, ShowcaseProject } from '@/types'

interface FxGeneratorDB extends DBSchema {
  projects: {
    key: string
    value: ImageProject
    indexes: { 'by-updatedAt': string }
  }
  originals: {
    key: string
    value: Blob
  }
  showcases: {
    key: string
    value: ShowcaseProject
    indexes: { 'by-projectId': string }
  }
  presets: {
    key: string
    value: Preset
    indexes: { 'by-effectType': string }
  }
  chainPresets: {
    key: string
    value: EffectChainPreset
  }
}

let dbPromise: Promise<IDBPDatabase<FxGeneratorDB>> | null = null

export function getDb(): Promise<IDBPDatabase<FxGeneratorDB>> {
  dbPromise ??= openDB<FxGeneratorDB>('fx-generator', 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('by-updatedAt', 'updatedAt')
        db.createObjectStore('originals')
      }
      if (oldVersion < 2) {
        const showcases = db.createObjectStore('showcases', { keyPath: 'id' })
        showcases.createIndex('by-projectId', 'projectId')
      }
      if (oldVersion < 3) {
        const presets = db.createObjectStore('presets', { keyPath: 'id' })
        presets.createIndex('by-effectType', 'effectType')
      }
      if (oldVersion < 4) {
        db.createObjectStore('chainPresets', { keyPath: 'id' })
      }
    },
  })
  return dbPromise
}
