import type { EffectNode, ExportSettings } from '@/types'
import { renderForExport } from '@/engine/pipeline/exportRenderer'
import { injectMetadataIntoJpeg } from './jpegMetadataInject'

export type ExportImageOptions = {
  sourceBitmap: ImageBitmap
  originalFile: File
  effects: EffectNode[]
  settings: ExportSettings
  baseName: string
}

export type ExportImageResult = { blob: Blob; filename: string; width: number; height: number }

const EXTENSION_FOR_FORMAT: Record<ExportSettings['format'], string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

export function stripExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName
}

export async function exportImage(options: ExportImageOptions): Promise<ExportImageResult> {
  const { sourceBitmap, originalFile, effects, settings, baseName } = options
  const maxDimension =
    settings.resolution === 'original' ? undefined : settings.resolution.maxDimension

  const rendered = await renderForExport({
    sourceBitmap,
    effects,
    format: settings.format,
    quality: settings.quality,
    maxDimension,
  })

  const blob =
    settings.format === 'jpeg'
      ? await injectMetadataIntoJpeg(rendered.blob, originalFile, settings.metadataPolicy)
      : rendered.blob

  return {
    blob,
    filename: `${stripExtension(baseName)}-fx.${EXTENSION_FOR_FORMAT[settings.format]}`,
    width: rendered.width,
    height: rendered.height,
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
