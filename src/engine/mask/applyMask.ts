import { maskValueAt } from './maskMath'
import type { MaskReference } from '@/types'

/**
 * Cuts `layer`'s alpha channel per pixel according to `mask`, evaluated against `base` for
 * luminosity masks (which derive their value from the underlying image's own tones, not the
 * effect's own output). Mutates `layer` in place; no-op for `{ kind: 'none' }`. Applied by
 * RenderPipeline after an effect renders its full, unmasked output — masking is a generic
 * compositing step, not something every individual effect renderer needs to implement itself.
 */
export function applyMaskToLayer(
  layer: OffscreenCanvas,
  base: OffscreenCanvas,
  mask: MaskReference,
): void {
  if (mask.kind === 'none') return
  const width = layer.width
  const height = layer.height
  const layerCtx = layer.getContext('2d', { willReadFrequently: true })
  if (!layerCtx) return

  let baseData: Uint8ClampedArray | null = null
  if (mask.kind === 'luminosity') {
    const baseCtx = base.getContext('2d', { willReadFrequently: true })
    baseData = baseCtx?.getImageData(0, 0, width, height).data ?? null
  }

  const layerImageData = layerCtx.getImageData(0, 0, width, height)
  const data = layerImageData.data
  for (let y = 0; y < height; y++) {
    const ny = (y + 0.5) / height
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const nx = (x + 0.5) / width
      const baseColor = baseData
        ? { r: baseData[i], g: baseData[i + 1], b: baseData[i + 2] }
        : undefined
      const value = maskValueAt(nx, ny, mask, baseColor)
      data[i + 3] = Math.round(data[i + 3] * value)
    }
  }
  layerCtx.putImageData(layerImageData, 0, 0)
}
