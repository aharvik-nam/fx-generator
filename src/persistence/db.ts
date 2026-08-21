import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ImageProject } from '@/types'

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
}

let dbPromise: Promise<IDBPDatabase<FxGeneratorDB>> | null = null

export function getDb(): Promise<IDBPDatabase<FxGeneratorDB>> {
  dbPromise ??= openDB<FxGeneratorDB>('fx-generator', 1, {
    upgrade(db) {
      const projects = db.createObjectStore('projects', { keyPath: 'id' })
      projects.createIndex('by-updatedAt', 'updatedAt')
      db.createObjectStore('originals')
    },
  })
  return dbPromise
}
