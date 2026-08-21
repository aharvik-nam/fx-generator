import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/** Standard 4x4 Bayer threshold matrix. */
const BAYER_4X4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

export const applyOrderedDithering: PixelTransform = (data, width, height, params) => {
  const levels = Math.max(2, Math.round(typeof params.levels === 'number' ? params.levels : 4))
  const step = 255 / (levels - 1)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Spreads each pixel's quantization by up to +/-half a step, using the pixel's
      // position in the repeating 4x4 matrix as a deterministic per-pixel bias — this is
      // what turns a flat posterize into a dithered gradient instead of hard banding.
      const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5
      const offset = threshold * step
      const i = (y * width + x) * 4
      data[i] = clamp8(Math.round((data[i] + offset) / step) * step)
      data[i + 1] = clamp8(Math.round((data[i + 1] + offset) / step) * step)
      data[i + 2] = clamp8(Math.round((data[i + 2] + offset) / step) * step)
    }
  }
}

export const orderedDitheringEffect: EffectDefinition = {
  id: 'ordered-dithering',
  name: 'Ordered dithering',
  category: 'halftone',
  description: 'Bayer-mønstret dithering som simulerer flere tonetrinn med et fast rutemønster.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    levels: { kind: 'slider', min: 2, max: 8, step: 1, default: 4, label: 'Nivåer' },
  },
  createRenderer: () => createPixelEffectRenderer(applyOrderedDithering),
}
