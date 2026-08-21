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
import { Images } from 'lucide-react'
import { useShowcaseStore } from '@/state/showcaseStore'
import { ShowcaseStateItem } from './ShowcaseStateItem'
import type { ShowcaseProject } from '@/types'

export function ShowcaseStateList({ showcase }: { showcase: ShowcaseProject }) {
  const reorderStates = useShowcaseStore((state) => state.reorderStates)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderStates(String(active.id), String(over.id))
    }
  }

  if (showcase.states.length === 0) {
    return (
      <div className="border-border text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm">
        <Images className="size-6" aria-hidden="true" />
        <p>
          Ingen states ennå. Bygg en effektkjede i Editor og klikk «Ny state fra gjeldende
          redigering».
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={showcase.states.map((state) => state.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {showcase.states.map((state) => (
            <ShowcaseStateItem key={state.id} state={state} showcase={showcase} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
