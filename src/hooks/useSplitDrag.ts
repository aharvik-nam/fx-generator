import { useRef, useState, type RefObject } from 'react'

type Orientation = 'vertical' | 'horizontal'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Drag-to-position state for a before/after split handle — 0-100 along `orientation`, driven by
 * pointer capture so the drag keeps tracking even if the pointer leaves the container. Shared
 * between BeforeAfterExplorer (two canvases + clip-path) and CanvasViewport's in-editor split
 * (one canvas + an overlay canvas + clip-path): both need the same ratio math and pointer-capture
 * handling, but render genuinely differently, so only this part is centralized.
 */
export function useSplitDrag(
  containerRef: RefObject<HTMLElement | null>,
  orientation: Orientation,
  initialPosition = 50,
) {
  const draggingRef = useRef(false)
  const [position, setPosition] = useState(initialPosition)

  function updatePositionFromPoint(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio =
      orientation === 'vertical'
        ? (clientX - rect.left) / rect.width
        : (clientY - rect.top) / rect.height
    setPosition(clamp(ratio * 100, 0, 100))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePositionFromPoint(event.clientX, event.clientY)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!draggingRef.current) return
    updatePositionFromPoint(event.clientX, event.clientY)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return { position, setPosition, handlePointerDown, handlePointerMove, handlePointerUp }
}
