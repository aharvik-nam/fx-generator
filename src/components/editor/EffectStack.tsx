import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Layers } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/state/projectStore'
import type { EffectNode } from '@/types'
import { EffectStackItem } from './EffectStackItem'
import { SaveChainPresetDialog } from './SaveChainPresetDialog'

const EMPTY_EFFECTS: EffectNode[] = []

export function EffectStack() {
  // Selecting `project` and falling back in the render body (rather than
  // `state.project?.effects ?? []` inside the selector) keeps the selector's return value
  // referentially stable — a fresh `[]` on every call makes Zustand's useSyncExternalStore
  // think state changed on every render, which loops forever.
  const project = useProjectStore((state) => state.project)
  const effects = project?.effects ?? EMPTY_EFFECTS
  const reorderEffects = useProjectStore((state) => state.reorderEffects)
  const selectedEffectId = useProjectStore((state) => state.selectedEffectId)
  const selectEffect = useProjectStore((state) => state.selectEffect)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderEffects(String(active.id), String(over.id))
    }
  }

  if (effects.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-sm">
        <Layers className="size-6" aria-hidden="true" />
        <p>Ingen effekter lagt til ennå. Velg en effekt i biblioteket til venstre.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <SaveChainPresetDialog effects={effects} />
      {effects.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="jump-to-effect" className="text-muted-foreground shrink-0 text-xs">
            Hopp til effekt
          </Label>
          <Select value={selectedEffectId ?? ''} onValueChange={(id) => selectEffect(id)}>
            <SelectTrigger id="jump-to-effect" size="sm" className="min-w-0 flex-1">
              <SelectValue placeholder="Velg en effekt…" />
            </SelectTrigger>
            <SelectContent>
              {effects.map((effect, index) => (
                <SelectItem key={effect.id} value={effect.id}>
                  {index + 1}. {effect.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={effects.map((effect) => effect.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {effects.map((effect) => (
              <EffectStackItem key={effect.id} effect={effect} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
