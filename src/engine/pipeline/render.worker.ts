/// <reference lib="webworker" />
import type { EffectNode, RenderQuality } from '@/types'
import { RenderPipeline } from './renderPipeline'

export type RenderWorkerRequest = {
  requestId: string
  sourceBitmap: ImageBitmap
  effects: EffectNode[]
  quality: RenderQuality
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  encodeQuality: number
  maxDimension?: number
}

export type RenderWorkerResponse =
  | { requestId: string; ok: true; blob: Blob; width: number; height: number }
  | { requestId: string; ok: false; error: string }

// Dedicated workers have no meaningful targetOrigin (they're same-origin by construction, only
// ever talk to the page that created them), so require-post-message-target-origin doesn't apply
// to self.postMessage here the way it would to window.postMessage.
self.addEventListener('message', async (event: MessageEvent<RenderWorkerRequest>) => {
  const { requestId, sourceBitmap, effects, quality, mimeType, encodeQuality, maxDimension } =
    event.data

  try {
    let bitmap = sourceBitmap
    const longestSide = Math.max(bitmap.width, bitmap.height)
    if (maxDimension && longestSide > maxDimension) {
      const scale = maxDimension / longestSide
      bitmap = await createImageBitmap(bitmap, {
        resizeWidth: Math.max(1, Math.round(bitmap.width * scale)),
        resizeHeight: Math.max(1, Math.round(bitmap.height * scale)),
        resizeQuality: 'high',
      })
    }

    const pipeline = new RenderPipeline()
    const canvas = pipeline.compute(bitmap, effects, quality)

    const blob = await canvas.convertToBlob({ type: mimeType, quality: encodeQuality })
    const response: RenderWorkerResponse = {
      requestId,
      ok: true,
      blob,
      width: canvas.width,
      height: canvas.height,
    }
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    self.postMessage(response)
  } catch (error) {
    const response: RenderWorkerResponse = {
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Ukjent feil under rendering av eksport.',
    }
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    self.postMessage(response)
  }
})
