import type { EffectNode, EffectParams } from './effect'

export type Preset = {
  id: string
  name: string
  description?: string
  effectType: string
  params: EffectParams
  createdAt: string
}

/** A saved snapshot of an entire effect chain (order, opacity, blend mode, mask, params — every
 * node as-is), reapplied by appending fresh copies of `effects` onto the current stack. */
export type EffectChainPreset = {
  id: string
  name: string
  description?: string
  effects: EffectNode[]
  createdAt: string
}
