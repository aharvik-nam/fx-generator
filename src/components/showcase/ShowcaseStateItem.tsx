import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, Copy, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useShowcaseStore } from '@/state/showcaseStore'
import type { ShowcaseProject, ShowcaseState } from '@/types'

type ShowcaseStateItemProps = { state: ShowcaseState; showcase: ShowcaseProject }

export function ShowcaseStateItem({ state, showcase }: ShowcaseStateItemProps) {
  const [expanded, setExpanded] = useState(false)
  const updateStateMeta = useShowcaseStore((s) => s.updateStateMeta)
  const duplicateState = useShowcaseStore((s) => s.duplicateState)
  const removeState = useShowcaseStore((s) => s.removeState)
  const setStartState = useShowcaseStore((s) => s.setStartState)
  const setEndState = useShowcaseStore((s) => s.setEndState)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: state.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const isStart = showcase.startStateId === state.id
  const isEnd = showcase.endStateId === state.id

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('border-border bg-popover rounded-md border', isDragging && 'opacity-50')}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Dra for å endre rekkefølge på ${state.name}`}
          className="text-muted-foreground hover:bg-accent cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        {state.thumbnail ? (
          <img src={state.thumbnail} alt="" className="size-10 shrink-0 rounded object-cover" />
        ) : (
          <div className="bg-muted size-10 shrink-0 rounded" aria-hidden="true" />
        )}

        <Label htmlFor={`name-${state.id}`} className="sr-only">
          Navn på state
        </Label>
        <Input
          id={`name-${state.id}`}
          value={state.name}
          onChange={(event) => updateStateMeta(state.id, { name: event.target.value })}
          className="h-7 flex-1"
        />

        <Button
          type="button"
          variant={isStart ? 'secondary' : 'ghost'}
          size="xs"
          aria-pressed={isStart}
          onClick={() => setStartState(state.id)}
        >
          Start
        </Button>
        <Button
          type="button"
          variant={isEnd ? 'secondary' : 'ghost'}
          size="xs"
          aria-pressed={isEnd}
          onClick={() => setEndState(state.id)}
        >
          Slutt
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Dupliser ${state.name}`}
          onClick={() => duplicateState(state.id)}
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Slett ${state.name}`}
          onClick={() => removeState(state.id)}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={
            expanded ? `Skjul detaljer for ${state.name}` : `Vis detaljer for ${state.name}`
          }
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            className={cn('size-3.5 transition-transform', !expanded && '-rotate-90')}
            aria-hidden="true"
          />
        </Button>
      </div>

      {expanded && (
        <div className="border-border flex flex-col gap-2 border-t p-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`desc-${state.id}`}
              className="text-muted-foreground text-xs font-normal"
            >
              Beskrivelse (kuratorisk)
            </Label>
            <Textarea
              id={`desc-${state.id}`}
              rows={2}
              value={state.description ?? ''}
              onChange={(event) => updateStateMeta(state.id, { description: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`notes-${state.id}`}
              className="text-muted-foreground text-xs font-normal"
            >
              Tekniske notater
            </Label>
            <Textarea
              id={`notes-${state.id}`}
              rows={2}
              value={state.notes ?? ''}
              onChange={(event) => updateStateMeta(state.id, { notes: event.target.value })}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {state.effectNodes.filter((effect) => effect.enabled).length} aktive effekt(er)
          </p>
        </div>
      )}
    </li>
  )
}
