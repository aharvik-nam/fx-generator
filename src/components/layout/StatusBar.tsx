import { useEffect, useState } from 'react'
import { useProjectStore } from '@/state/projectStore'
import { useRenderStatsStore } from '@/state/renderStatsStore'
import { useViewStore } from '@/state/viewStore'

const HINTS = [
  'Scroll for å zoome · dra i stakken for å endre rekkefølge',
  '⌘Z angrer, ⌘⇧Z gjør om',
  'Klikk en effekt i stakken for å se parameterne',
  'Før/etter-glidebryteren sammenligner original og gjeldende kjede',
]

const HINT_INTERVAL_MS = 8000

export function StatusBar() {
  const project = useProjectStore((state) => state.project)
  const view = useViewStore((state) => state.view)
  const lastRenderMs = useRenderStatsStore((state) => state.lastRenderMs)
  const [hintIndex, setHintIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setHintIndex((index) => (index + 1) % HINTS.length),
      HINT_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [])

  const dimensions = project?.originalMetadata.dimensions
  const effects = project?.effects ?? []
  const activeCount = effects.filter((effect) => effect.enabled).length

  return (
    <div className="border-border bg-card text-muted-foreground flex h-6 shrink-0 items-center gap-3.5 overflow-hidden px-3 font-mono text-[10.5px]">
      <span className="text-success shrink-0 whitespace-nowrap">
        <span aria-hidden="true">● </span>Lokal · ingenting forlater maskinen
      </span>
      {dimensions && (
        <span className="shrink-0 whitespace-nowrap">
          {dimensions.width} × {dimensions.height}
        </span>
      )}
      {project && (
        <span className="shrink-0 whitespace-nowrap">
          {activeCount} effekt{activeCount === 1 ? '' : 'er'} · {effects.length} noder
        </span>
      )}
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {HINTS[hintIndex]}
      </span>
      <span className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap opacity-60">
        {view === 'editor' && lastRenderMs !== null ? `render ${Math.round(lastRenderMs)} ms` : '—'}
      </span>
    </div>
  )
}
