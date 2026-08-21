import { rgbToHex } from '../effects/canvas2d/colorMath'

const QUANTIZATION_STEP = 32
const ALPHA_THRESHOLD = 128

/**
 * Dominant-color extraction by frequency bucketing: each pixel's channels are rounded to the
 * nearest QUANTIZATION_STEP, bucketed, and the most frequent buckets become the palette. Simpler
 * than a proper median-cut/k-means quantizer, but accurate enough for a Recipe's "colour
 * palette" summary — this never needs to be a print-accurate palette, just a useful hint.
 */
export function extractDominantColors(data: Uint8ClampedArray, count: number): string[] {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_THRESHOLD) continue
    const r = Math.round(data[i] / QUANTIZATION_STEP) * QUANTIZATION_STEP
    const g = Math.round(data[i + 1] / QUANTIZATION_STEP) * QUANTIZATION_STEP
    const b = Math.round(data[i + 2] / QUANTIZATION_STEP) * QUANTIZATION_STEP
    const key = `${r},${g},${b}`
    const existing = buckets.get(key)
    if (existing) existing.count++
    else buckets.set(key, { count: 1, r, g, b })
  }

  return [...buckets.values()]
    .toSorted((a, b) => b.count - a.count)
    .slice(0, count)
    .map((bucket) => rgbToHex(bucket))
}

export function extractDominantPaletteFromCanvas(canvas: OffscreenCanvas, count = 5): string[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return extractDominantColors(data, count)
}
