import type { BlendMode } from '@/types'

/**
 * Canvas 2D's globalCompositeOperation values match CSS/SVG blend mode names exactly for
 * every mode in our BlendMode union, so this is a direct, exhaustive mapping — no custom
 * shader blending needed for any Priority-1 effect.
 */
const BLEND_MODE_TO_COMPOSITE_OPERATION: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity',
}

export const BLEND_MODE_OPTIONS: readonly BlendMode[] = Object.keys(
  BLEND_MODE_TO_COMPOSITE_OPERATION,
) as BlendMode[]

export function blendModeToCompositeOperation(blendMode: BlendMode): GlobalCompositeOperation {
  return BLEND_MODE_TO_COMPOSITE_OPERATION[blendMode]
}
