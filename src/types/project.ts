import type { CameraState, EffectNode } from './effect'
import type { OriginalImageMetadata } from './metadata'
import type { ExportSettings } from './export'

/**
 * A single editable image project. The original bytes are never mutated: `originalImageId`
 * is a reference into the IndexedDB blob store, and every visual change lives in `effects`.
 * The Effect Recipe (implementation code for the effect chain) is never stored — it's derived
 * on demand from `effects` by `export/recipeGenerator.ts`.
 */
export type ImageProject = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  originalImageId: string
  originalMetadata: OriginalImageMetadata
  effects: EffectNode[]
  camera: CameraState
  exportSettings: ExportSettings
}
