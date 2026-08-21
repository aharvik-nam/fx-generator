import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { blobToDataUrl } from '@/lib/blob'
import type { EffectNode } from '@/types'

const THUMBNAIL_WIDTH = 240

/** Renders a state's effect chain against `source` and returns a small JPEG data URL. */
export async function generateThumbnailDataUrl(
  source: ImageBitmap,
  effects: EffectNode[],
): Promise<string> {
  const pipeline = new RenderPipeline()
  const fullCanvas = pipeline.compute(source, effects, 'preview')

  const scale = THUMBNAIL_WIDTH / fullCanvas.width
  const height = Math.max(1, Math.round(fullCanvas.height * scale))
  const thumbnailCanvas = new OffscreenCanvas(THUMBNAIL_WIDTH, height)
  const ctx = thumbnailCanvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(fullCanvas, 0, 0, THUMBNAIL_WIDTH, height)

  const blob = await thumbnailCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
  return blobToDataUrl(blob)
}
