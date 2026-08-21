import type { EffectParams } from './effect'

export type Preset = {
  id: string
  name: string
  description?: string
  effectType: string
  params: EffectParams
  createdAt: string
}
