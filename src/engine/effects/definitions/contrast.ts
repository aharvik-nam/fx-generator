import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export const applyContrast: PixelTransform = (data, _width, _height, params) => {
  const amount = typeof params.amount === 'number' ? params.amount : 0
  const factor = (259 * (amount + 255)) / (255 * (259 - amount))
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(factor * (data[i] - 128) + 128)
    data[i + 1] = clamp8(factor * (data[i + 1] - 128) + 128)
    data[i + 2] = clamp8(factor * (data[i + 2] - 128) + 128)
  }
}

export const contrastEffect: EffectDefinition = {
  id: 'contrast',
  name: 'Contrast',
  category: 'tone',
  description: 'Øker eller reduserer kontrasten i bildet.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    amount: { kind: 'slider', min: -100, max: 100, step: 1, default: 0, label: 'Mengde' },
  },
  createRenderer: () => createPixelEffectRenderer(applyContrast),
}
