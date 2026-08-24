import { useEffect, useRef, useState } from 'react'
import { Columns2, GitCompare, MoveHorizontal, MoveVertical, Rows2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { renderToCanvas } from '@/engine/pipeline/renderToCanvas'
import { formatMetadataExcerpt } from '@/showcase/formatMetadataExcerpt'
import type { ImageProject, ShowcaseProject } from '@/types'

type Orientation = 'vertical' | 'horizontal'

type BeforeAfterExplorerProps = {
  showcase: ShowcaseProject
  project: ImageProject
  sourceBitmap: ImageBitmap
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function EmptyPane({ message }: { message: string }) {
  return (
    <div className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 p-8 text-center">
        <GitCompare className="size-10" aria-hidden="true" />
        <p className="max-w-sm text-sm">{message}</p>
      </div>
    </div>
  )
}

export function BeforeAfterExplorer({ showcase, project, sourceBitmap }: BeforeAfterExplorerProps) {
  const beforeState = showcase.states.find((state) => state.id === showcase.startStateId)
  const afterState = showcase.states.find((state) => state.id === showcase.endStateId)

  const beforeCanvasRef = useRef<HTMLCanvasElement>(null)
  const afterCanvasRef = useRef<HTMLCanvasElement>(null)
  const beforePipelineRef = useRef(new RenderPipeline())
  const afterPipelineRef = useRef(new RenderPipeline())
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [position, setPosition] = useState(50)

  useEffect(() => {
    if (!beforeCanvasRef.current || !beforeState) return
    renderToCanvas(
      beforePipelineRef.current,
      beforeCanvasRef.current,
      sourceBitmap,
      beforeState.effectNodes,
      'preview',
    )
  }, [sourceBitmap, beforeState])

  useEffect(() => {
    if (!afterCanvasRef.current || !afterState) return
    renderToCanvas(
      afterPipelineRef.current,
      afterCanvasRef.current,
      sourceBitmap,
      afterState.effectNodes,
      'preview',
    )
  }, [sourceBitmap, afterState])

  function updatePositionFromPoint(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio =
      orientation === 'vertical'
        ? (clientX - rect.left) / rect.width
        : (clientY - rect.top) / rect.height
    setPosition(clamp(ratio * 100, 0, 100))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePositionFromPoint(event.clientX, event.clientY)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    updatePositionFromPoint(event.clientX, event.clientY)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (
    showcase.states.length < 2 ||
    !beforeState ||
    !afterState ||
    beforeState.id === afterState.id
  ) {
    return (
      <EmptyPane message="Velg to ulike states som Start og Slutt i showcase-editoren for å bruke Before/After Explorer." />
    )
  }

  const metadataExcerpt = showcase.displaySettings.showMetadata
    ? formatMetadataExcerpt(project.originalMetadata)
    : null
  const afterEffects = afterState.effectNodes.filter((effect) => effect.enabled)

  const clipPath =
    orientation === 'vertical' ? `inset(0 0 0 ${position}%)` : `inset(${position}% 0 0 0)`

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
      {showcase.texts.intro && (
        <p className="text-muted-foreground mx-auto max-w-xl text-center text-sm">
          {showcase.texts.intro}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
        <div className="flex flex-col text-sm">
          <span className="text-muted-foreground text-xs">Før</span>
          <span className="font-medium">{beforeState.name}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setOrientation((value) => (value === 'vertical' ? 'horizontal' : 'vertical'))
          }
        >
          {orientation === 'vertical' ? (
            <Rows2 aria-hidden="true" />
          ) : (
            <Columns2 aria-hidden="true" />
          )}
          {orientation === 'vertical' ? 'Vannrett deling' : 'Loddrett deling'}
        </Button>
        <div className="flex flex-col text-right text-sm">
          <span className="text-muted-foreground text-xs">Etter</span>
          <span className="font-medium">{afterState.name}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-3xl touch-none overflow-hidden rounded-md shadow-lg select-none"
        style={{ aspectRatio: `${sourceBitmap.width} / ${sourceBitmap.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setPosition(50)}
      >
        <canvas ref={beforeCanvasRef} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={afterCanvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ clipPath }}
        />

        <div
          aria-hidden="true"
          className={cn(
            'bg-background pointer-events-none absolute shadow-md',
            orientation === 'vertical'
              ? 'top-0 bottom-0 -ml-px w-0.5'
              : 'right-0 left-0 -mt-px h-0.5',
          )}
          style={orientation === 'vertical' ? { left: `${position}%` } : { top: `${position}%` }}
        />

        <div
          aria-hidden="true"
          className={cn(
            'bg-background text-foreground pointer-events-none absolute flex size-9 items-center justify-center rounded-full shadow-md ring-2 ring-white',
            orientation === 'vertical'
              ? 'top-1/2 -translate-x-1/2 -translate-y-1/2'
              : 'left-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
          style={orientation === 'vertical' ? { left: `${position}%` } : { top: `${position}%` }}
        >
          {orientation === 'vertical' ? (
            <MoveHorizontal className="size-4" aria-hidden="true" />
          ) : (
            <MoveVertical className="size-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <Slider
        aria-label="Before/after-glidebryter"
        value={[position]}
        min={0}
        max={100}
        step={1}
        onValueChange={(values) => setPosition(values[0])}
        className="mx-auto w-full max-w-3xl"
      />

      <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
        {afterEffects.length > 0 && showcase.displaySettings.showParams && (
          <ul className="text-muted-foreground flex flex-wrap justify-center gap-1.5 text-xs">
            {afterEffects.map((effect) => (
              <li key={effect.id} className="border-border rounded-full border px-2 py-0.5">
                {effect.name}
              </li>
            ))}
          </ul>
        )}
        {metadataExcerpt && <p className="text-muted-foreground text-xs">{metadataExcerpt}</p>}
      </div>

      {showcase.texts.outro && (
        <p className="text-muted-foreground mx-auto max-w-xl text-center text-sm">
          {showcase.texts.outro}
        </p>
      )}
    </div>
  )
}
