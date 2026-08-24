import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { mulberry32 } from '../../random/seededRandom'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

/**
 * Noise is generated per size×size block (not per pixel) so `size` reads as a visible grain
 * scale rather than just changing the noise's spatial frequency at the same amplitude. `size`
 * is scaled by canvas resolution so the same param value looks the same regardless of image size.
 */
export const applyFilmGrain: PixelTransform = (data, width, height, params, seed) => {
  const amount = typeof params.amount === 'number' ? params.amount : 0.15
  const rawSize = typeof params.size === 'number' ? params.size : 1
  const size = Math.max(1, Math.round(rawSize * resolutionScaleFactor(width, height)))
  const random = mulberry32(seed)
  const strength = amount * 80

  for (let blockY = 0; blockY < height; blockY += size) {
    for (let blockX = 0; blockX < width; blockX += size) {
      const noise = (random() * 2 - 1) * strength
      const maxY = Math.min(blockY + size, height)
      const maxX = Math.min(blockX + size, width)
      for (let y = blockY; y < maxY; y++) {
        for (let x = blockX; x < maxX; x++) {
          const i = (y * width + x) * 4
          data[i] = clamp8(data[i] + noise)
          data[i + 1] = clamp8(data[i + 1] + noise)
          data[i + 2] = clamp8(data[i + 2] + noise)
        }
      }
    }
  }
}

export const filmGrainEffect: EffectDefinition = {
  id: 'film-grain',
  name: 'Film grain',
  category: 'texture',
  description: 'Legger til deterministisk filmkorn basert på et lagret frø (seed).',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    amount: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.15, label: 'Mengde' },
    size: { kind: 'slider', min: 1, max: 4, step: 1, default: 1, label: 'Kornstørrelse' },
  },
  createRenderer: () => createPixelEffectRenderer(applyFilmGrain),
}
