import type { EffectDefinition } from '@/types'
import { hexToRgb, relativeLuminance } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

/**
 * Sobel edge detection: every pixel is replaced by `lineColor` where the local luminance
 * gradient magnitude exceeds `threshold`, and `background` everywhere else — a clean outline of
 * the image's contours. Luminance is precomputed for every pixel first so the 3x3 kernel pass
 * doesn't recompute it (and doesn't accidentally sample already-written line/background pixels).
 */
export const applyOutline: PixelTransform = (data, width, height, params) => {
  const threshold = typeof params.threshold === 'number' ? params.threshold : 80
  const lineColor = hexToRgb(typeof params.lineColor === 'string' ? params.lineColor : '#000000')
  const background = hexToRgb(typeof params.background === 'string' ? params.background : '#ffffff')

  const luminance = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    luminance[i] = relativeLuminance({ r: data[idx], g: data[idx + 1], b: data[idx + 2] }) * 255
  }

  const result = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0
      let gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        const sy = Math.min(height - 1, Math.max(0, y + ky))
        for (let kx = -1; kx <= 1; kx++) {
          const sx = Math.min(width - 1, Math.max(0, x + kx))
          const sample = luminance[sy * width + sx]
          const kernelIndex = (ky + 1) * 3 + (kx + 1)
          gx += sample * SOBEL_X[kernelIndex]
          gy += sample * SOBEL_Y[kernelIndex]
        }
      }
      const magnitude = Math.sqrt(gx * gx + gy * gy)
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
