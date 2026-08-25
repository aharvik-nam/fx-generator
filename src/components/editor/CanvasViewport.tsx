import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Columns2, Maximize2, MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/state/projectStore'
import { useRenderStatsStore } from '@/state/renderStatsStore'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { renderToCanvas } from '@/engine/pipeline/renderToCanvas'
import { useSplitDrag } from '@/hooks/useSplitDrag'
import { CanvasInfoChips } from './CanvasInfoChips'
import type { CameraState, EffectNode } from '@/types'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const EMPTY_EFFECTS: EffectNode[] = []
const DEFAULT_CAMERA: CameraState = { zoom: 1, panX: 0, panY: 0 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function CanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null)
  const pipelineRef = useRef(new RenderPipeline())
  const cameraRef = useRef<CameraState>({ zoom: 1, panX: 0, panY: 0 })
  const panStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const previousBitmapRef = useRef<ImageBitmap | null>(null)

  const previewBitmap = useProjectStore((state) => state.assets.previewBitmap)
  const project = useProjectStore((state) => state.project)
  const showBeforeAfter = useProjectStore((state) => state.showBeforeAfter)
  const toggleBeforeAfter = useProjectStore((state) => state.toggleBeforeAfter)
  const setCamera = useProjectStore((state) => state.setCamera)
  const setLastRenderMs = useRenderStatsStore((state) => state.setLastRenderMs)

  // Selectors must return stable references (Zustand's useSyncExternalStore compares by
  // Object.is) — `project?.effects ?? []` would hand back a fresh array every call and
  // loop forever, so the fallback is applied here in the render body instead.
  const effects = project?.effects ?? EMPTY_EFFECTS
  const camera = project?.camera ?? DEFAULT_CAMERA

  const [fitScale, setFitScale] = useState(1)
  const splitDrag = useSplitDrag(containerRef, 'vertical')

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  const computeFitScale = useCallback(() => {
    const container = containerRef.current
    if (!container || !previewBitmap) return 1
    const { width, height } = container.getBoundingClientRect()
    const scale = Math.min(width / previewBitmap.width, height / previewBitmap.height, 1)
    return Number.isFinite(scale) && scale > 0 ? scale : 1
  }, [previewBitmap])

  useLayoutEffect(() => {
    const scale = computeFitScale()
    setFitScale(scale)
    if (previewBitmap && previewBitmap !== previousBitmapRef.current) {
      previousBitmapRef.current = previewBitmap
      setCamera({ zoom: scale, panX: 0, panY: 0 })
    }
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => setFitScale(computeFitScale()))
    observer.observe(container)
    return () => observer.disconnect()
  }, [computeFitScale, previewBitmap, setCamera])

  // Native (non-passive) wheel listener: React's onWheel is passive by default, which
  // silently ignores preventDefault() — zooming needs to stop the page from scrolling.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      const nextZoom = clamp(
        cameraRef.current.zoom * (1 - event.deltaY * 0.001),
        MIN_ZOOM,
        MAX_ZOOM,
      )
      setCamera({ zoom: nextZoom })
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [setCamera])

  // Renders directly rather than deferring via requestAnimationFrame: rAF only fires on a
  // compositor tick, which some browser states (backgrounded/throttled tabs) can delay
  // indefinitely — that would leave the canvas blank with no error. React already batches
  // the state updates that land here, and the pipeline's dirty-index cache (renderPipeline.ts)
  // keeps a single render cheap, so there's nothing to gain from waiting a frame.
  useEffect(() => {
    if (!previewBitmap || !canvasRef.current) return
    const start = performance.now()
    renderToCanvas(pipelineRef.current, canvasRef.current, previewBitmap, effects, 'preview')
    setLastRenderMs(performance.now() - start)
  }, [previewBitmap, effects, setLastRenderMs])

  // The "before" overlay is always just the untouched preview bitmap, drawn once per image —
  // no RenderPipeline involved, unlike the main canvas above. Also depends on `showBeforeAfter`:
  // the overlay <canvas> only mounts (and its ref only attaches) while the split view is active,
  // so toggling it on must re-run this even though `previewBitmap` itself hasn't changed.
  useEffect(() => {
    if (!previewBitmap || !showBeforeAfter || !beforeCanvasRef.current) return
    const canvas = beforeCanvasRef.current
    canvas.width = previewBitmap.width
    canvas.height = previewBitmap.height
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(previewBitmap, 0, 0)
  }, [previewBitmap, showBeforeAfter])

  function stepZoom(factor: number) {
    setCamera({ zoom: clamp(cameraRef.current.zoom * factor, MIN_ZOOM, MAX_ZOOM) })
  }

  function handleFitToScreen() {
    setCamera({ zoom: fitScale, panX: 0, panY: 0 })
  }

  function handlePanPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (camera.zoom <= fitScale) return
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: camera.panX,
      startPanY: camera.panY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePanPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return
    setCamera({
      panX: panState.startPanX + (event.clientX - panState.startX),
      panY: panState.startPanY + (event.clientY - panState.startY),
    })
  }

  function handlePanPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (!previewBitmap) return null

  const canPan = camera.zoom > fitScale + 0.001
  const canvasTransform = `translate(-50%, -50%) translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom})`
  const imageRendering = camera.zoom > 2 ? 'pixelated' : 'auto'

  return (
    <div className="bg-background relative flex flex-1 flex-col">
      <div
        ref={containerRef}
        className={cn(
          'bg-checkerboard relative flex-1 touch-none overflow-hidden',
          showBeforeAfter ? 'cursor-ew-resize' : canPan && 'cursor-grab active:cursor-grabbing',
        )}
        onPointerDown={showBeforeAfter ? splitDrag.handlePointerDown : handlePanPointerDown}
        onPointerMove={showBeforeAfter ? splitDrag.handlePointerMove : handlePanPointerMove}
        onPointerUp={showBeforeAfter ? splitDrag.handlePointerUp : handlePanPointerUp}
        onPointerCancel={showBeforeAfter ? splitDrag.handlePointerUp : handlePanPointerUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2"
          style={{ transform: canvasTransform, imageRendering }}
        />
        {showBeforeAfter && (
          <>
            <canvas
              ref={beforeCanvasRef}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: canvasTransform,
                imageRendering,
                clipPath: `inset(0 ${100 - splitDrag.position}% 0 0)`,
              }}
            />
            {/* Fixed light colors, not theme tokens: this overlay must stay visible against
                arbitrary photo content underneath, regardless of the app's own (dark) theme. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 -ml-px w-0.5 bg-white/90 shadow-md"
              style={{ left: `${splitDrag.position}%` }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md"
              style={{ left: `${splitDrag.position}%` }}
            >
              <MoveHorizontal className="size-4" aria-hidden="true" />
            </div>
            <span className="bg-background/75 text-muted-foreground absolute top-10 left-2 z-10 rounded-md px-1.5 py-0.5 font-mono text-[10px]">
              FØR
            </span>
            <span className="bg-background/75 absolute top-2 right-2 z-10 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-[#7aa2ff]">
              ETTER
            </span>
          </>
        )}
        <CanvasInfoChips
          previewBitmap={previewBitmap}
          effectCount={effects.filter((e) => e.enabled).length}
        />
      </div>

      <div className="border-border bg-card flex items-center justify-center gap-1 border-t p-2">
        <Button variant="ghost" size="icon" aria-label="Zoom ut" onClick={() => stepZoom(1 / 1.25)}>
          <ZoomOut aria-hidden="true" />
        </Button>
        <span className="w-12 text-center font-mono text-sm tabular-nums">
          {Math.round(camera.zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" aria-label="Zoom inn" onClick={() => stepZoom(1.25)}>
          <ZoomIn aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tilpass til skjerm"
          onClick={handleFitToScreen}
        >
          <Maximize2 aria-hidden="true" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          variant={showBeforeAfter ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={showBeforeAfter}
          onClick={toggleBeforeAfter}
        >
          <Columns2 aria-hidden="true" />
          Før / etter
        </Button>
      </div>
    </div>
  )
}
