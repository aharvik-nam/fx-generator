import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Columns2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/state/projectStore'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { renderToCanvas } from '@/engine/pipeline/renderToCanvas'
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

  // Selectors must return stable references (Zustand's useSyncExternalStore compares by
  // Object.is) — `project?.effects ?? []` would hand back a fresh array every call and
  // loop forever, so the fallback is applied here in the render body instead.
  const effects = project?.effects ?? EMPTY_EFFECTS
  const camera = project?.camera ?? DEFAULT_CAMERA

  const [fitScale, setFitScale] = useState(1)

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
    renderToCanvas(
      pipelineRef.current,
      canvasRef.current,
      previewBitmap,
      showBeforeAfter ? [] : effects,
      'preview',
    )
  }, [previewBitmap, effects, showBeforeAfter])

  function stepZoom(factor: number) {
    setCamera({ zoom: clamp(cameraRef.current.zoom * factor, MIN_ZOOM, MAX_ZOOM) })
  }

  function handleFitToScreen() {
    setCamera({ zoom: fitScale, panX: 0, panY: 0 })
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
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

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return
    setCamera({
      panX: panState.startPanX + (event.clientX - panState.startX),
      panY: panState.startPanY + (event.clientY - panState.startY),
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (!previewBitmap) return null

  const canPan = camera.zoom > fitScale + 0.001

  return (
    <div className="bg-muted/30 relative flex flex-1 flex-col">
      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 touch-none overflow-hidden',
          canPan && 'cursor-grab active:cursor-grabbing',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom})`,
            imageRendering: camera.zoom > 2 ? 'pixelated' : 'auto',
          }}
        />
      </div>

      <div className="border-border bg-background flex items-center justify-center gap-1 border-t p-2">
        <Button variant="ghost" size="icon" aria-label="Zoom ut" onClick={() => stepZoom(1 / 1.25)}>
          <ZoomOut aria-hidden="true" />
        </Button>
        <span className="w-12 text-center text-sm tabular-nums">
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
