import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/** A discrete 1D Gaussian kernel for the given sigma, normalized to sum to 1. Radius is 3*sigma
 * (rounded up), enough to capture the vast majority of the Gaussian's mass. */
export function gaussianKernel1D(sigma: number): number[] {
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const kernel: number[] = []
  let sum = 0
  for (let i = -radius; i <= radius; i++) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel.push(value)
    sum += value
  }
  return kernel.map((v) => v / sum)
}

/**
 * Separable Gaussian blur: a horizontal pass followed by a vertical pass, edge-clamped at the
 * border. Returns a flat RGB Float32Array (no alpha) rather than mutating `data` in place, since
 * a separable blur needs to read each row/column's *unblurred* values while processing it.
 */
export function gaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const kernel = gaussianKernel1D(sigma)
  const radius = (kernel.length - 1) / 2
  const temp = new Float32Array(width * height * 3)
  const output = new Float32Array(width * height * 3)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k))
        const i = (y * width + sx) * 4
        const w = kernel[k + radius]
        r += data[i] * w
        g += data[i + 1] * w
        b += data[i + 2] * w
      }
      const ti = (y * width + x) * 3
      temp[ti] = r
      temp[ti + 1] = g
      temp[ti + 2] = b
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k))
        const ti = (sy * width + x) * 3
        const w = kernel[k + radius]
        r += temp[ti] * w
        g += temp[ti + 1] * w
        b += temp[ti + 2] * w
      }
      const oi = (y * width + x) * 3
      output[oi] = r
      output[oi + 1] = g
      output[oi + 2] = b
    }
  }
  return output
}

/**
 * One effect covering both ends of the softness spectrum via the unsharp-mask formula
 * `result = original + amount * (original - blurred)`: `amount = -1` cancels the original term
 * entirely and leaves pure `blurred` (full blur), `amount = 0` is a no-op, and `amount > 0`
 * pushes each pixel further away from its blurred neighborhood average — sharpening by
 * exaggerating local contrast at edges.
 */
export const applyBlurSharpen: PixelTransform = (data, width, height, params) => {
  const radius = typeof params.radius === 'number' ? params.radius : 3
  const amount = typeof params.amount === 'number' ? params.amount : 0
  if (amount === 0) return

  const blurred = gaussianBlur(data, width, height, radius)
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    const bi = p * 3
    data[i] = clamp8(Math.round(data[i] + amount * (data[i] - blurred[bi])))
    data[i + 1] = clamp8(Math.round(data[i + 1] + amount * (data[i + 1] - blurred[bi + 1])))
    data[i + 2] = clamp8(Math.round(data[i + 2] + amount * (data[i + 2] - blurred[bi + 2])))
  }
}

export const blurSharpenEffect: EffectDefinition = {
  id: 'blur-sharpen',
  name: 'Uskarphet / skarphet',
  category: 'texture',
  description:
    'Én glidebryter fra full Gaussisk uskarphet, via ingen endring, til skarptegning (unsharp mask) — negative verdier mykner bildet, positive forsterker kanter og detaljer.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    radius: { kind: 'slider', min: 1, max: 15, step: 0.5, default: 3, label: 'Radius' },
    amount: { kind: 'slider', min: -1, max: 2, step: 0.05, default: 0, label: 'Mengde' },
  },
  createRenderer: () => createPixelEffectRenderer(applyBlurSharpen),
}
