import { useProjectStore } from '@/state/projectStore'
import type { EffectDefinition, EffectNode } from '@/types'
import { SliderParam } from './SliderParam'
import { ColorParam } from './ColorParam'
import { SelectParam } from './SelectParam'
import { BooleanParam } from './BooleanParam'
import { NumberParam } from './NumberParam'

type ParamControlsProps = {
  effect: EffectNode
  definition: EffectDefinition
}

export function ParamControls({ effect, definition }: ParamControlsProps) {
  const updateEffectParam = useProjectStore((state) => state.updateEffectParam)

  return (
    <>
      {Object.entries(definition.paramSchema).map(([key, schema]) => {
        const rawValue = effect.params[key] ?? schema.default

        switch (schema.kind) {
          case 'slider':
            return (
              <SliderParam
                key={key}
                label={schema.label}
                min={schema.min}
                max={schema.max}
                step={schema.step}
                value={typeof rawValue === 'number' ? rawValue : schema.default}
                onChange={(value, options) => updateEffectParam(effect.id, key, value, options)}
              />
            )
          case 'number':
            return (
              <NumberParam
                key={key}
                label={schema.label}
                min={schema.min}
                max={schema.max}
                value={typeof rawValue === 'number' ? rawValue : schema.default}
                onChange={(value) => updateEffectParam(effect.id, key, value)}
              />
            )
          case 'color':
            return (
              <ColorParam
                key={key}
                label={schema.label}
                value={typeof rawValue === 'string' ? rawValue : schema.default}
                onChange={(value) => updateEffectParam(effect.id, key, value)}
              />
            )
          case 'select':
            return (
              <SelectParam
                key={key}
                label={schema.label}
                options={schema.options}
                value={typeof rawValue === 'string' ? rawValue : schema.default}
                onChange={(value) => updateEffectParam(effect.id, key, value)}
              />
            )
          case 'boolean':
            return (
              <BooleanParam
                key={key}
                label={schema.label}
                value={typeof rawValue === 'boolean' ? rawValue : schema.default}
                onChange={(value) => updateEffectParam(effect.id, key, value)}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
