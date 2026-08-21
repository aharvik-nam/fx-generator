import type { EffectNode, RenderQuality } from '@/types'
import type { RenderPipeline } from './renderPipeline'

/**
 * Blits a pipeline's computed result onto a visible `<canvas>`. Kept separate from
 * RenderPipeline itself (which only ever touches OffscreenCanvas) so render.worker.ts can
 * import the pipeline without pulling in DOM-only types — this file is DOM-only and must
 * never be imported from a `.worker.ts` file.
 */
export function renderToCanvas(
  pipeline: RenderPipeline,
  target: HTMLCanvasElement,
  source: ImageBitmap,
  effects: EffectNode[],
  quality: RenderQuality = 'preview',
): void {
  const finalCanvas = pipeline.compute(source, effects, quality)
  target.width = finalCanvas.width
  target.height = finalCanvas.height
  const ctx = target.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, target.width, target.height)
  ctx.drawImage(finalCanvas, 0, 0)
}
