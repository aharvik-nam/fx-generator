import { Bookmark } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePresetStore } from '@/state/presetStore'
import { useProjectStore } from '@/state/projectStore'
import type { EffectNode } from '@/types'

/** Only rendered when at least one saved preset matches this effect's type. */
export function ApplyPresetSelect({ effect }: { effect: EffectNode }) {
  const presets = usePresetStore((state) => state.presets)
  const applyEffectParams = useProjectStore((state) => state.applyEffectParams)
  const matching = presets.filter((preset) => preset.effectType === effect.type)

  if (matching.length === 0) return null

  return (
    <Select
      value=""
      onValueChange={(presetId) => {
        const preset = matching.find((p) => p.id === presetId)
        if (preset) applyEffectParams(effect.id, preset.params)
      }}
    >
      <SelectTrigger aria-label={`Bruk lagret preset for ${effect.name}`} className="h-7 w-full">
        <Bookmark className="size-3.5 shrink-0" aria-hidden="true" />
        <SelectValue placeholder="Bruk preset..." />
      </SelectTrigger>
      <SelectContent>
        {matching.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
