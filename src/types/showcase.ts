import type { CameraState, EffectNode } from './effect'
import type { ExportSettings } from './export'

export type TransitionType = 'cut' | 'fade' | 'crossfade' | 'slide' | 'shader'

export type StateTransition = {
  type: TransitionType
  durationMs: number
  easing: string
}

/**
 * One named, self-contained snapshot of an editor state: a full effect chain + camera,
 * not a diff. Non-destructive and independent of other states by design — duplicating and
 * editing a state can never affect another. Diff-based storage is a possible later
 * optimization, deliberately not built for the MVP.
 */
export type ShowcaseState = {
  id: string
  name: string
  description?: string
  thumbnail?: string
  effectNodes: EffectNode[]
  camera?: CameraState
  transition?: StateTransition
  scrollPosition?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ScrollMode =
  | 'vertical-story'
  | 'horizontal-gallery'
  | 'scrollytelling'
  | 'pinned-canvas'
  | 'before-after'
  | 'parallax'
  | 'free-explore'

/** Scroll modes implemented in the MVP (M4/M5). The rest are typed now, built later. */
export const IMPLEMENTED_SCROLL_MODES = [
  'vertical-story',
  'before-after',
] as const satisfies readonly ScrollMode[]

export type ShowcaseDisplaySettings = {
  showMetadata: boolean
  showParams: boolean
}

export type ShowcaseTexts = {
  intro?: string
  outro?: string
}

export type ShowcaseProject = {
  id: string
  projectId: string
  title: string
  states: ShowcaseState[]
  startStateId: string
  endStateId: string
  scrollMode: ScrollMode
  texts: ShowcaseTexts
  displaySettings: ShowcaseDisplaySettings
  exportSettings: ExportSettings
  createdAt: string
  updatedAt: string
}
