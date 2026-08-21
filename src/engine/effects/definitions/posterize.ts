import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export const applyPosterize: PixelTransform = (data, _width, _height, params) => {
  const levels = Math.max(2, Math.round(typeof params.levels === 'number' ? params.levels : 4))
  const step = 255 / (levels - 1)

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(Math.round(Math.round(data[i] / step) * step))
    data[i + 1] = clamp8(Math.round(Math.round(data[i + 1] / step) * step))
    data[i + 2] = clamp8(Math.round(Math.round(data[i + 2] / step) * step))
  }
}

export const posterizeEffect: EffectDefinition = {
  id: 'posterize',
  name: 'Posterize',
  category: 'tone',
  description: 'Reduserer antall tonetrinn per fargekanal for et flatt, plakat-aktig utseende.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    levels: { kind: 'slider', min: 2, max: 32, step: 1, default: 4, label: 'Nivåer' },
  },
  createRenderer: () => createPixelEffectRenderer(applyPosterize),
}
