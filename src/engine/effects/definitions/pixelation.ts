import type { EffectDefinition } from '@/types'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export const applyPixelation: PixelTransform = (data, width, height, params) => {
  const rawBlockSize = typeof params.blockSize === 'number' ? params.blockSize : 12
  const blockSize = Math.max(1, Math.round(rawBlockSize * resolutionScaleFactor(width, height)))
  if (blockSize <= 1) return

  for (let blockY = 0; blockY < height; blockY += blockSize) {
    const maxY = Math.min(blockY + blockSize, height)
    for (let blockX = 0; blockX < width; blockX += blockSize) {
      const maxX = Math.min(blockX + blockSize, width)

      let sumR = 0
      let sumG = 0
      let sumB = 0
      let sumA = 0
      let count = 0
      for (let y = blockY; y < maxY; y++) {
        for (let x = blockX; x < maxX; x++) {
          const i = (y * width + x) * 4
          sumR += data[i]
          sumG += data[i + 1]
          sumB += data[i + 2]
          sumA += data[i + 3]
          count++
        }
      }
      const avgR = sumR / count
      const avgG = sumG / count
      const avgB = sumB / count
      const avgA = sumA / count

      for (let y = blockY; y < maxY; y++) {
        for (let x = blockX; x < maxX; x++) {
          const i = (y * width + x) * 4
          data[i] = avgR
          data[i + 1] = avgG
          data[i + 2] = avgB
          data[i + 3] = avgA
        }
      }
    }
  }
}

export const pixelationEffect: EffectDefinition = {
  id: 'pixelation',
  name: 'Pixelation',
  category: 'stylize',
  description: 'Erstatter blokker av piksler med gjennomsnittsfargen for et mosaikk-uttrykk.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    blockSize: { kind: 'slider', min: 2, max: 64, step: 1, default: 12, label: 'Blokkstørrelse' },
  },
  createRenderer: () => createPixelEffectRenderer(applyPixelation),
}
