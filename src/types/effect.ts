export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export type MaskReference =
  | { kind: 'none' }
  | { kind: 'linear-gradient'; angle: number; feather: number }
  | { kind: 'radial-gradient'; centerX: number; centerY: number; radius: number; feather: number }
  | { kind: 'luminosity'; invert: boolean }
  | { kind: 'bitmap'; assetId: string; invert: boolean }

export type EffectParams = Record<string, number | string | boolean>

/**
 * One entry in a non-destructive effect chain. `type` references an `EffectDefinition.id`
 * in the effect registry; everything needed to reproduce this node's output lives on the
 * node itself (params + seed), never on hidden renderer state.
 */
export type EffectNode = {
  id: string
  type: string
  name: string
  enabled: boolean
  opacity: number
  blendMode: BlendMode
  params: EffectParams
  seed?: number
  mask?: MaskReference
}

export type EffectCategory =
  'tone' | 'color' | 'texture' | 'distortion' | 'stylize' | 'halftone' | 'glitch' | 'dimensional'

export type ParamSchemaEntry =
  | { kind: 'slider'; min: number; max: number; step: number; default: number; label: string }
  | { kind: 'number'; min?: number; max?: number; default: number; label: string }
  | { kind: 'color'; default: string; label: string }
  | { kind: 'select'; options: { value: string; label: string }[]; default: string; label: string }
  | { kind: 'boolean'; default: boolean; label: string }

export type RenderQuality = 'preview' | 'export'

export type RenderSurface = {
  canvas: OffscreenCanvas | HTMLCanvasElement
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
}

export type EffectRenderContext = {
  params: EffectParams
  seed: number
  quality: RenderQuality
  mask?: MaskReference
}

export type EffectRenderer = {
  apply: (surface: RenderSurface, context: EffectRenderContext) => void | Promise<void>
}

/**
 * Static description of an effect type, registered once in `engine/effects/registry.ts`.
 * `rendererKind` lets the pipeline stay renderer-agnostic: Priority-1 effects are all
 * `canvas2d`, later effects can be `webgl`/`webgpu`/`worker` without changing this contract.
 */
export type EffectDefinition = {
  id: string
  name: string
  category: EffectCategory
  description: string
  rendererKind: 'canvas2d' | 'webgl' | 'webgpu' | 'worker'
  paramSchema: Record<string, ParamSchemaEntry>
  usesSeed: boolean
  createRenderer: () => EffectRenderer
}

export type CameraState = {
  zoom: number
  panX: number
  panY: number
}

/** The minimal renderable input the pipeline consumes — also what interpolation produces. */
export type RenderState = {
  effects: EffectNode[]
  camera: CameraState
  quality: RenderQuality
}
