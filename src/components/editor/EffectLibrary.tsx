import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { listEffectDefinitions } from '@/engine/effects/registry'
import { EFFECT_CATEGORY_LABELS } from '@/engine/effects/categoryLabels'
import { useProjectStore } from '@/state/projectStore'
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

  const groups = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const definitions = listEffectDefinitions().filter((definition) =>
      definition.name.toLowerCase().includes(normalized),
    )
    return groupByCategory(definitions)
  }, [search])

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
        {groups.length === 0 && (
          <p className="text-muted-foreground text-sm">Ingen effekter matcher søket.</p>
        )}
        <div className="flex flex-col gap-4">
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
