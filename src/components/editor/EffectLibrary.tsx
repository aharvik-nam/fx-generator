import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getEffectDefinition, listEffectDefinitions } from '@/engine/effects/registry'
import { EFFECT_CATEGORY_LABELS } from '@/engine/effects/categoryLabels'
import { useProjectStore } from '@/state/projectStore'
import { usePresetStore } from '@/state/presetStore'
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

export function EffectLibrary() {
  const [search, setSearch] = useState('')
  const hasProject = useProjectStore((state) => state.project !== null)
  const addEffect = useProjectStore((state) => state.addEffect)
  const presets = usePresetStore((state) => state.presets)
  const deletePreset = usePresetStore((state) => state.deletePreset)

  const normalized = search.trim().toLowerCase()

  const groups = useMemo(() => {
    const definitions = listEffectDefinitions().filter((definition) =>
      definition.name.toLowerCase().includes(normalized),
    )
    return groupByCategory(definitions)
  }, [normalized])

  const matchingPresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(normalized) ||
          getEffectDefinition(preset.effectType).name.toLowerCase().includes(normalized),
      ),
    [presets, normalized],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b p-3">
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
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!hasProject && (
          <p className="text-muted-foreground mb-3 text-sm">
            Last opp et bilde for å begynne å legge til effekter.
          </p>
        )}
        {groups.length === 0 && matchingPresets.length === 0 && (
          <p className="text-muted-foreground text-sm">Ingen effekter matcher søket.</p>
        )}
        <div className="flex flex-col gap-4">
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
          {groups.map(([category, definitions]) => (
            <section key={category}>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                {EFFECT_CATEGORY_LABELS[category]}
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
                          {definition.name}
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
