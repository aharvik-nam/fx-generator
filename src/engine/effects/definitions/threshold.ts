import type { EffectDefinition } from '@/types'
import { hexToRgb, relativeLuminance } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/**
 * Hard luminance cutoff: every pixel becomes either `darkColor` or `lightColor` depending on
 * which side of `threshold` it falls on — a flat, high-contrast graphic/poster look. Unlike
 * Duotone (a smooth gradient between two colors), this is a binary split with no in-between.
 */
export const applyThreshold: PixelTransform = (data, _width, _height, params) => {
  const threshold = (typeof params.threshold === 'number' ? params.threshold : 50) / 100
  const darkColor = hexToRgb(typeof params.darkColor === 'string' ? params.darkColor : '#000000')
  const lightColor = hexToRgb(typeof params.lightColor === 'string' ? params.lightColor : '#ffffff')

  for (let i = 0; i < data.length; i += 4) {
    const luminance = relativeLuminance({ r: data[i], g: data[i + 1], b: data[i + 2] })
    const color = luminance > threshold ? lightColor : darkColor
    data[i] = color.r
    data[i + 1] = color.g
    data[i + 2] = color.b
  }
}

export const thresholdEffect: EffectDefinition = {
  id: 'threshold',
  name: 'Threshold',
  category: 'tone',
  description:
    'Reduserer bildet til to flate farger basert på en lyshetsterskel, for et grafisk plakat-/skjermtrykk-uttrykk.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    threshold: { kind: 'slider', min: 0, max: 100, step: 1, default: 50, label: 'Terskel' },
    darkColor: { kind: 'color', default: '#000000', label: 'Mørk farge' },
    lightColor: { kind: 'color', default: '#ffffff', label: 'Lys farge' },
  },
  createRenderer: () => createPixelEffectRenderer(applyThreshold),
}
