import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export const applyExposure: PixelTransform = (data, _width, _height, params) => {
  const stops = typeof params.stops === 'number' ? params.stops : 0
  const factor = Math.pow(2, stops)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * factor)
    data[i + 1] = clamp8(data[i + 1] * factor)
    data[i + 2] = clamp8(data[i + 2] * factor)
  }
}

export const exposureEffect: EffectDefinition = {
  id: 'exposure',
  name: 'Exposure',
  category: 'tone',
  description: 'Justerer bildets lyshet i EV-trinn (stops).',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    stops: { kind: 'slider', min: -3, max: 3, step: 0.05, default: 0, label: 'Stops' },
  },
  createRenderer: () => createPixelEffectRenderer(applyExposure),
}
