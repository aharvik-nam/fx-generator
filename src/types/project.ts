import type { CameraState, EffectNode } from './effect'
import type { OriginalImageMetadata } from './metadata'
import type { ExportSettings } from './export'
import type { PromptRecipe } from './recipe'

/**
 * A single editable image project. The original bytes are never mutated: `originalImageId`
 * is a reference into the IndexedDB blob store, and every visual change lives in `effects`.
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
  recipe: PromptRecipe
  exportSettings: ExportSettings
}
