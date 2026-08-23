import type { EffectDefinition, EffectNode, EffectParams } from '@/types'
import { exposureEffect } from './definitions/exposure'
import { contrastEffect } from './definitions/contrast'
import { duotoneEffect } from './definitions/duotone'
import { filmGrainEffect } from './definitions/filmGrain'
import { vignetteEffect } from './definitions/vignette'
import { posterizeEffect } from './definitions/posterize'
import { rgbChannelShiftEffect } from './definitions/rgbChannelShift'
import { pixelationEffect } from './definitions/pixelation'
import { orderedDitheringEffect } from './definitions/orderedDithering'

const EFFECT_DEFINITIONS: EffectDefinition[] = [
  exposureEffect,
  contrastEffect,
  duotoneEffect,
  filmGrainEffect,
  vignetteEffect,
  posterizeEffect,
  rgbChannelShiftEffect,
  pixelationEffect,
  orderedDitheringEffect,
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
