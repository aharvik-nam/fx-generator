import type { EffectDefinition } from '@/types'
import { hexToRgb } from '../canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../canvas2d/sobelGradient'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/**
 * Sobel edge detection: every pixel is replaced by `lineColor` where the local luminance
 * gradient magnitude exceeds `threshold`, and `background` everywhere else — a clean outline of
 * the image's contours.
 */
export const applyOutline: PixelTransform = (data, width, height, params) => {
  const threshold = typeof params.threshold === 'number' ? params.threshold : 80
  const lineColor = hexToRgb(typeof params.lineColor === 'string' ? params.lineColor : '#000000')
  const background = hexToRgb(typeof params.background === 'string' ? params.background : '#ffffff')

  const luminance = computeLuminanceGrid(data, width, height)

  const result = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { magnitude } = sobelGradientAt(luminance, width, height, x, y)
      const color = magnitude > threshold ? lineColor : background
      const i = (y * width + x) * 4
      result[i] = color.r
      result[i + 1] = color.g
      result[i + 2] = color.b
      result[i + 3] = data[i + 3]
    }
  }
  data.set(result)
}

export const outlineEffect: EffectDefinition = {
  id: 'outline',
  name: 'Outline',
  category: 'stylize',
  description:
    'Finner konturene i bildet med kantdeteksjon (Sobel) og tegner dem som linjer på en ensfarget bakgrunn.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    threshold: { kind: 'slider', min: 0, max: 400, step: 5, default: 80, label: 'Terskel' },
    lineColor: { kind: 'color', default: '#000000', label: 'Linjefarge' },
    background: { kind: 'color', default: '#ffffff', label: 'Bakgrunn' },
  },
  createRenderer: () => createPixelEffectRenderer(applyOutline),
}
