import type { EffectDefinition, EffectNode, EffectParams } from '@/types'
import { exposureEffect } from './definitions/exposure'
import { contrastEffect } from './definitions/contrast'
import { duotoneEffect } from './definitions/duotone'
import { filmGrainEffect } from './definitions/filmGrain'
import { analogGrainEffect } from './definitions/analogGrain'
import { vignetteEffect } from './definitions/vignette'
import { posterizeEffect } from './definitions/posterize'
import { rgbChannelShiftEffect } from './definitions/rgbChannelShift'
import { pixelationEffect } from './definitions/pixelation'
import { orderedDitheringEffect } from './definitions/orderedDithering'
import { halftoneEffect } from './definitions/halftone'
import { pixelSortEffect } from './definitions/pixelSort'
import { outlineEffect } from './definitions/outline'
import { thresholdEffect } from './definitions/threshold'
import { crossHatchEffect } from './definitions/crossHatch'
import { stipplingEffect } from './definitions/stippling'
import { painterlyEffect } from './definitions/painterly'
import { flowFieldEffect } from './definitions/flowField'
import { voronoiEffect } from './definitions/voronoi'
import { particlesEffect } from './definitions/particles'
import { cellularAutomatonEffect } from './definitions/cellularAutomaton'
import { colorQuantizeEffect } from './definitions/colorQuantize'
import { kaleidoscopeEffect } from './definitions/kaleidoscope'
import { kuwaharaEffect } from './definitions/kuwahara'
import { blurSharpenEffect } from './definitions/blurSharpen'

const EFFECT_DEFINITIONS: EffectDefinition[] = [
  exposureEffect,
  contrastEffect,
  duotoneEffect,
  filmGrainEffect,
  analogGrainEffect,
  vignetteEffect,
  posterizeEffect,
  rgbChannelShiftEffect,
  pixelationEffect,
  orderedDitheringEffect,
  halftoneEffect,
  pixelSortEffect,
  outlineEffect,
  thresholdEffect,
  crossHatchEffect,
  stipplingEffect,
  painterlyEffect,
  flowFieldEffect,
  voronoiEffect,
  particlesEffect,
  cellularAutomatonEffect,
  colorQuantizeEffect,
  kaleidoscopeEffect,
  kuwaharaEffect,
  blurSharpenEffect,
]

const registry = new Map(EFFECT_DEFINITIONS.map((definition) => [definition.id, definition]))

export function listEffectDefinitions(): EffectDefinition[] {
  return EFFECT_DEFINITIONS
}

export function getEffectDefinition(type: string): EffectDefinition {
  const definition = registry.get(type)
  if (!definition) throw new Error(`Ukjent effekttype: "${type}"`)
  return definition
}

export function defaultParamsFor(type: string): EffectParams {
  const definition = getEffectDefinition(type)
  const params: EffectParams = {}
  for (const [key, schema] of Object.entries(definition.paramSchema)) {
    params[key] = schema.default
  }
  return params
}

export function createEffectNode(type: string, paramsOverride?: EffectParams): EffectNode {
  const definition = getEffectDefinition(type)
  return {
    id: crypto.randomUUID(),
    type: definition.id,
    name: definition.name,
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    params: paramsOverride ?? defaultParamsFor(type),
    seed: definition.usesSeed ? Math.floor(Math.random() * 2 ** 31) : undefined,
  }
}
