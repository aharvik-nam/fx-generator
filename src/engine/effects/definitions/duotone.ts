import type { EffectDefinition } from '@/types'
import { clamp8, hexToRgb, relativeLuminance } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export const applyDuotone: PixelTransform = (data, _width, _height, params) => {
  const shadow = hexToRgb(typeof params.shadowColor === 'string' ? params.shadowColor : '#1a1a2e')
  const highlight = hexToRgb(
    typeof params.highlightColor === 'string' ? params.highlightColor : '#f4d06f',
  )
  for (let i = 0; i < data.length; i += 4) {
    const luminance = relativeLuminance({ r: data[i], g: data[i + 1], b: data[i + 2] })
    data[i] = clamp8(shadow.r + (highlight.r - shadow.r) * luminance)
    data[i + 1] = clamp8(shadow.g + (highlight.g - shadow.g) * luminance)
    data[i + 2] = clamp8(shadow.b + (highlight.b - shadow.b) * luminance)
  }
}

export const duotoneEffect: EffectDefinition = {
  id: 'duotone',
  name: 'Duotone',
  category: 'color',
  description: 'Erstatter fargene med en glidende overgang mellom to farger basert på lyshet.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    shadowColor: { kind: 'color', default: '#1a1a2e', label: 'Skygger' },
    highlightColor: { kind: 'color', default: '#f4d06f', label: 'Høylys' },
  },
  createRenderer: () => createPixelEffectRenderer(applyDuotone),
}
