import type { EffectNode, ExportImageFormat } from '@/types'
import type { RenderWorkerRequest, RenderWorkerResponse } from './render.worker'

const FORMAT_TO_MIME_TYPE: Record<ExportImageFormat, RenderWorkerRequest['mimeType']> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export type ExportRenderOptions = {
  sourceBitmap: ImageBitmap
  effects: EffectNode[]
  format: ExportImageFormat
  quality: number
  maxDimension?: number
}

export type ExportRenderResult = { blob: Blob; width: number; height: number }

/**
 * Renders the full effect chain at export resolution in a dedicated Web Worker (via
 * OffscreenCanvas), so a large image doesn't block the UI thread during export. The source
 * bitmap is sent by structured-clone copy, not transfer — transferring would neuter the
 * shared `assets.originalBitmap` still held by the editor.
 */
export function renderForExport(options: ExportRenderOptions): Promise<ExportRenderResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })
    const requestId = crypto.randomUUID()

    worker.addEventListener('message', (event: MessageEvent<RenderWorkerResponse>) => {
      const data = event.data
      if (data.requestId !== requestId) return
      worker.terminate()
      if (data.ok) resolve({ blob: data.blob, width: data.width, height: data.height })
      else reject(new Error(data.error))
    })

    worker.addEventListener('error', (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Eksport-worker feilet.'))
    })

    const request: RenderWorkerRequest = {
      requestId,
      sourceBitmap: options.sourceBitmap,
      effects: options.effects,
      quality: 'export',
      mimeType: FORMAT_TO_MIME_TYPE[options.format],
      encodeQuality: options.quality,
      maxDimension: options.maxDimension,
    }
    // Worker.postMessage has no targetOrigin parameter (unlike window.postMessage, which is
    // what this rule is really meant to guard).
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    worker.postMessage(request)
  })
}
