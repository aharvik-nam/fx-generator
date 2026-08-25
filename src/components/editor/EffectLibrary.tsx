import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getEffectDefinition, listEffectDefinitions } from '@/engine/effects/registry'
import { EFFECT_CATEGORY_LABELS } from '@/engine/effects/categoryLabels'
import { EFFECT_CATEGORY_COLORS } from '@/engine/effects/categoryColors'
import { useProjectStore } from '@/state/projectStore'
import { usePresetStore } from '@/state/presetStore'
import { useChainPresetStore } from '@/state/chainPresetStore'
import type { EffectCategory, EffectDefinition } from '@/types'

function groupByCategory(definitions: EffectDefinition[]): [EffectCategory, EffectDefinition[]][] {
  const groups = new Map<EffectCategory, EffectDefinition[]>()
  for (const definition of definitions) {
    const existing = groups.get(definition.category)
    if (existing) existing.push(definition)
    else groups.set(definition.category, [definition])
  }
  return [...groups.entries()]
}

const ALL_CATEGORIES = 'all'

export function EffectLibrary() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<EffectCategory | typeof ALL_CATEGORIES>(ALL_CATEGORIES)
  const hasProject = useProjectStore((state) => state.project !== null)
  const addEffect = useProjectStore((state) => state.addEffect)
  const addEffectsFromChainPreset = useProjectStore((state) => state.addEffectsFromChainPreset)
  const presets = usePresetStore((state) => state.presets)
  const deletePreset = usePresetStore((state) => state.deletePreset)
  const chainPresets = useChainPresetStore((state) => state.chainPresets)
  const deleteChainPreset = useChainPresetStore((state) => state.deleteChainPreset)

  const normalized = search.trim().toLowerCase()

  const groups = useMemo(() => {
    const definitions = listEffectDefinitions().filter(
      (definition) =>
        definition.name.toLowerCase().includes(normalized) &&
        (category === ALL_CATEGORIES || definition.category === category),
    )
    return groupByCategory(definitions)
  }, [normalized, category])

  const matchingPresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(normalized) ||
          getEffectDefinition(preset.effectType).name.toLowerCase().includes(normalized),
      ),
    [presets, normalized],
  )

  const matchingChainPresets = useMemo(
    () => chainPresets.filter((preset) => preset.name.toLowerCase().includes(normalized)),
    [chainPresets, normalized],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex flex-col gap-2 border-b p-3">
        <Label htmlFor="effect-search" className="sr-only">
          Søk i effekter
        </Label>
        <Input
          id="effect-search"
          type="search"
          placeholder="Søk i effekter..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Label htmlFor="effect-category" className="sr-only">
          Filtrer på kategori
        </Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as EffectCategory | typeof ALL_CATEGORIES)}
        >
          <SelectTrigger id="effect-category" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Alle kategorier</SelectItem>
            {Object.entries(EFFECT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!hasProject && (
          <p className="text-muted-foreground mb-3 text-sm">
            Last opp et bilde for å begynne å legge til effekter.
          </p>
        )}
        {groups.length === 0 &&
          matchingPresets.length === 0 &&
          matchingChainPresets.length === 0 && (
            <p className="text-muted-foreground text-sm">Ingen effekter matcher søket.</p>
          )}
        <div className="flex flex-col gap-4">
          {matchingChainPresets.length > 0 && (
            <section>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                Dine effektkjeder
              </h3>
              <ul className="flex flex-col gap-1">
                {matchingChainPresets.map((preset) => (
                  <li key={preset.id} className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full flex-1 justify-between"
                          disabled={!hasProject}
                          aria-label={`Legg til effektkjede ${preset.name}`}
                          onClick={() => addEffectsFromChainPreset(preset.effects)}
                        >
                          <span className="truncate">{preset.name}</span>
                          <Plus className="shrink-0" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {preset.effects.length} effekt{preset.effects.length === 1 ? '' : 'er'}:{' '}
                        {preset.effects.map((effect) => effect.name).join(' → ')}
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={`Slett effektkjede ${preset.name}`}
                      onClick={() => void deleteChainPreset(preset.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {matchingPresets.length > 0 && (
            <section>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                Dine presets
              </h3>
              <ul className="flex flex-col gap-1">
                {matchingPresets.map((preset) => (
                  <li key={preset.id} className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full flex-1 justify-between"
                          disabled={!hasProject}
                          aria-label={`Legg til preset ${preset.name}`}
                          onClick={() => addEffect(preset.effectType, preset.params)}
                        >
                          <span className="truncate">{preset.name}</span>
                          <Plus className="shrink-0" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getEffectDefinition(preset.effectType).name}-preset
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={`Slett preset ${preset.name}`}
                      onClick={() => void deletePreset(preset.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {groups.map(([groupCategory, definitions]) => (
            <section key={groupCategory}>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                {EFFECT_CATEGORY_LABELS[groupCategory]}
              </h3>
              <ul className="flex flex-col gap-1">
                {definitions.map((definition) => (
                  <li key={definition.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          disabled={!hasProject}
                          onClick={() => addEffect(definition.id)}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: EFFECT_CATEGORY_COLORS[definition.category],
                              }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{definition.name}</span>
                          </span>
                          <Plus aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{definition.description}</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
