import { useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, Copy, GripVertical, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useProjectStore } from '@/state/projectStore'
import { getEffectDefinition } from '@/engine/effects/registry'
import { BLEND_MODE_OPTIONS } from '@/engine/color/blend'
import { BLEND_MODE_LABELS } from '@/engine/color/blendModeLabels'
import { ApplyPresetSelect } from './ApplyPresetSelect'
import { MaskControls } from './MaskControls'
import { ParamControls } from './params/ParamControls'
import { SavePresetDialog } from './SavePresetDialog'
import { SliderParam } from './params/SliderParam'
import { SelectParam } from './params/SelectParam'
import type { BlendMode, EffectNode } from '@/types'

const BLEND_MODE_SELECT_OPTIONS = BLEND_MODE_OPTIONS.map((mode) => ({
  value: mode,
  label: BLEND_MODE_LABELS[mode],
}))

type EffectStackItemProps = { effect: EffectNode }

export function EffectStackItem({ effect }: EffectStackItemProps) {
  const definition = getEffectDefinition(effect.type)

  const selectedEffectId = useProjectStore((state) => state.selectedEffectId)
  // Accordion behavior: only the selected effect is expanded, so a long stack stays scannable
  // instead of every effect's full param panel piling up and pushing the canvas out of view.
  const expanded = selectedEffectId === effect.id
  const selectEffect = useProjectStore((state) => state.selectEffect)
  const toggleEffectEnabled = useProjectStore((state) => state.toggleEffectEnabled)
  const setEffectOpacity = useProjectStore((state) => state.setEffectOpacity)
  const setEffectBlendMode = useProjectStore((state) => state.setEffectBlendMode)
  const duplicateEffect = useProjectStore((state) => state.duplicateEffect)
  const removeEffect = useProjectStore((state) => state.removeEffect)
  const resetEffectParams = useProjectStore((state) => state.resetEffectParams)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: effect.id,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const itemRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (expanded) itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [expanded])

  return (
    <li
      ref={(node) => {
        setNodeRef(node)
        itemRef.current = node
      }}
      style={style}
      className={cn(
        'border-border bg-background rounded-md border',
        isDragging && 'opacity-50',
        selectedEffectId === effect.id && 'ring-ring ring-1',
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Dra for å endre rekkefølge på ${effect.name}`}
          className="text-muted-foreground hover:bg-accent cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <Switch
          checked={effect.enabled}
          onCheckedChange={() => toggleEffectEnabled(effect.id)}
          aria-label={`${effect.enabled ? 'Skru av' : 'Skru på'} ${effect.name}`}
        />

        <button
          type="button"
          onClick={() => selectEffect(expanded ? null : effect.id)}
          className={cn(
            'flex-1 truncate text-left text-sm font-medium',
            !effect.enabled && 'text-muted-foreground line-through',
          )}
        >
          {effect.name}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Nullstill parametere for ${effect.name}`}
          onClick={() => resetEffectParams(effect.id)}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </Button>
        <SavePresetDialog effect={effect} />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Dupliser ${effect.name}`}
          onClick={() => duplicateEffect(effect.id)}
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Slett ${effect.name}`}
          onClick={() => removeEffect(effect.id)}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={
            expanded ? `Skjul parametere for ${effect.name}` : `Vis parametere for ${effect.name}`
          }
          aria-expanded={expanded}
          onClick={() => selectEffect(expanded ? null : effect.id)}
        >
          <ChevronDown
            className={cn('size-3.5 transition-transform', !expanded && '-rotate-90')}
            aria-hidden="true"
          />
        </Button>
      </div>

      {expanded && (
        <div className="border-border flex flex-col gap-3 border-t px-3 py-3">
          <SliderParam
            label="Opacity"
            min={0}
            max={100}
            step={1}
            value={Math.round(effect.opacity * 100)}
            onChange={(value, options) => setEffectOpacity(effect.id, value / 100, options)}
          />
          <SelectParam
            label="Blend mode"
            value={effect.blendMode}
            options={BLEND_MODE_SELECT_OPTIONS}
            onChange={(value) => setEffectBlendMode(effect.id, value as BlendMode)}
          />
          <div className="border-border border-t border-dashed" />
          <MaskControls effect={effect} />
          <div className="border-border border-t border-dashed" />
          <ApplyPresetSelect effect={effect} />
          <ParamControls effect={effect} definition={definition} />
        </div>
      )}
    </li>
  )
}
