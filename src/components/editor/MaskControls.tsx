import { useProjectStore } from '@/state/projectStore'
import { SelectParam } from './params/SelectParam'
import { SliderParam } from './params/SliderParam'
import { BooleanParam } from './params/BooleanParam'
import type { EffectNode, MaskReference } from '@/types'

const MASK_KIND_OPTIONS = [
  { value: 'none', label: 'Ingen' },
  { value: 'linear-gradient', label: 'Lineær gradient' },
  { value: 'radial-gradient', label: 'Radial gradient' },
  { value: 'luminosity', label: 'Lyshet' },
]

const DEFAULT_MASK_FOR_KIND: Record<string, MaskReference> = {
  'linear-gradient': { kind: 'linear-gradient', angle: 0, feather: 0.3 },
  'radial-gradient': {
    kind: 'radial-gradient',
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.5,
    feather: 0.3,
  },
  luminosity: { kind: 'luminosity', invert: false },
}

const NO_MASK: MaskReference = { kind: 'none' }

export function MaskControls({ effect }: { effect: EffectNode }) {
  const setEffectMask = useProjectStore((state) => state.setEffectMask)
  const mask = effect.mask ?? NO_MASK

  function handleKindChange(kind: string) {
    setEffectMask(effect.id, DEFAULT_MASK_FOR_KIND[kind] ?? NO_MASK)
  }

  return (
    <div className="flex flex-col gap-2">
      <SelectParam
        label="Maske"
        value={mask.kind}
        options={MASK_KIND_OPTIONS}
        onChange={handleKindChange}
      />

      {mask.kind === 'linear-gradient' && (
        <>
          <SliderParam
            label="Vinkel"
            min={0}
            max={360}
            step={1}
            value={mask.angle}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, angle: value }, options)
            }
          />
          <SliderParam
            label="Myking"
            min={0}
            max={100}
            step={1}
            value={Math.round(mask.feather * 100)}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, feather: value / 100 }, options)
            }
          />
        </>
      )}

      {mask.kind === 'radial-gradient' && (
        <>
          <SliderParam
            label="Senter X"
            min={0}
            max={100}
            step={1}
            value={Math.round(mask.centerX * 100)}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, centerX: value / 100 }, options)
            }
          />
          <SliderParam
            label="Senter Y"
            min={0}
            max={100}
            step={1}
            value={Math.round(mask.centerY * 100)}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, centerY: value / 100 }, options)
            }
          />
          <SliderParam
            label="Radius"
            min={0}
            max={100}
            step={1}
            value={Math.round(mask.radius * 100)}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, radius: value / 100 }, options)
            }
          />
          <SliderParam
            label="Myking"
            min={0}
            max={100}
            step={1}
            value={Math.round(mask.feather * 100)}
            onChange={(value, options) =>
              setEffectMask(effect.id, { ...mask, feather: value / 100 }, options)
            }
          />
        </>
      )}

      {mask.kind === 'luminosity' && (
        <BooleanParam
          label="Inverter"
          value={mask.invert}
          onChange={(value) => setEffectMask(effect.id, { ...mask, invert: value })}
        />
      )}
    </div>
  )
}
