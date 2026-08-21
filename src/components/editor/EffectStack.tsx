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
import { useProjectStore } from '@/state/projectStore'
import type { EffectNode } from '@/types'
import { EffectStackItem } from './EffectStackItem'

const EMPTY_EFFECTS: EffectNode[] = []

export function EffectStack() {
  // Selecting `project` and falling back in the render body (rather than
  // `state.project?.effects ?? []` inside the selector) keeps the selector's return value
  // referentially stable — a fresh `[]` on every call makes Zustand's useSyncExternalStore
  // think state changed on every render, which loops forever.
  const project = useProjectStore((state) => state.project)
  const effects = project?.effects ?? EMPTY_EFFECTS
  const reorderEffects = useProjectStore((state) => state.reorderEffects)

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={effects.map((effect) => effect.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2 p-3">
          {effects.map((effect) => (
            <EffectStackItem key={effect.id} effect={effect} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
