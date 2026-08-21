import type { EffectDefinition } from '@/types'
import { clamp01, clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export const applyVignette: PixelTransform = (data, width, height, params) => {
  const amount = clamp01(typeof params.amount === 'number' ? params.amount : 0.5)
  const size = clamp01(typeof params.size === 'number' ? params.size : 0.5)
  const softness = Math.max(
    0.001,
    clamp01(typeof params.softness === 'number' ? params.softness : 0.5),
  )

  if (amount <= 0) return

  const centerX = width / 2
  const centerY = height / 2
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX
      const dy = y - centerY
      const normalizedDistance = Math.sqrt(dx * dx + dy * dy) / maxDistance
      const edge = clamp01((normalizedDistance - size) / softness)
      const factor = 1 - amount * edge
      const i = (y * width + x) * 4
      data[i] = clamp8(data[i] * factor)
      data[i + 1] = clamp8(data[i + 1] * factor)
      data[i + 2] = clamp8(data[i + 2] * factor)
    }
  }
}

export const vignetteEffect: EffectDefinition = {
  id: 'vignette',
  name: 'Vignette',
  category: 'tone',
  description: 'Mørklegger bildekantene mot midten for å trekke blikket innover.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    amount: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Mengde' },
    size: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Størrelse' },
    softness: { kind: 'slider', min: 0.01, max: 1, step: 0.01, default: 0.5, label: 'Mykhet' },
  },
  createRenderer: () => createPixelEffectRenderer(applyVignette),
}
