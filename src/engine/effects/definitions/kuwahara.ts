import type { EffectDefinition } from '@/types'
import { clamp8, type Rgb } from '../canvas2d/colorMath'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

type QuadrantStats = Rgb & { variance: number }

/** Mean color and luminance variance of one quadrant window (inclusive of its corner at the
 * pixel), clamped at the image border. */
export function quadrantStats(
  data: Uint8ClampedArray,
  luminance: Float32Array,
  width: number,
  height: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): QuadrantStats {
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let sumL = 0
  let sumL2 = 0
  let count = 0
  for (let y = y0; y <= y1; y++) {
    if (y < 0 || y >= height) continue
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= width) continue
      const i = (y * width + x) * 4
      sumR += data[i]
      sumG += data[i + 1]
      sumB += data[i + 2]
      const l = luminance[y * width + x]
      sumL += l
      sumL2 += l * l
      count++
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0, variance: Infinity }
  const meanL = sumL / count
  return {
    r: sumR / count,
    g: sumG / count,
    b: sumB / count,
    variance: sumL2 / count - meanL * meanL,
  }
}

/**
 * For each pixel, evaluates the four overlapping `(radius+1)`-sized quadrants around it (each
 * including the pixel itself) and returns the mean color of whichever quadrant has the lowest
 * luminance variance. The low-variance quadrant is the "flattest" nearby region, so this smooths
 * texture and noise while an edge — which always pushes the variance of any quadrant crossing it
 * higher — survives untouched, unlike a plain blur which softens edges along with everything
 * else. Pure; the renderer below is the only thing that writes back into canvas pixel data.
 */
export function kuwaharaPixel(
  data: Uint8ClampedArray,
  luminance: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): Rgb {
  const quadrants = [
    quadrantStats(data, luminance, width, height, x - radius, x, y - radius, y),
    quadrantStats(data, luminance, width, height, x, x + radius, y - radius, y),
    quadrantStats(data, luminance, width, height, x - radius, x, y, y + radius),
    quadrantStats(data, luminance, width, height, x, x + radius, y, y + radius),
  ]
  let best = quadrants[0]
  for (let i = 1; i < quadrants.length; i++) {
    if (quadrants[i].variance < best.variance) best = quadrants[i]
  }
  return { r: best.r, g: best.g, b: best.b }
}

export const applyKuwahara: PixelTransform = (data, width, height, params) => {
  const rawRadius = typeof params.radius === 'number' ? params.radius : 3
  const radius = Math.max(1, Math.round(rawRadius * resolutionScaleFactor(width, height)))
  const original = Uint8ClampedArray.from(data)
  const luminance = computeLuminanceGrid(original, width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = kuwaharaPixel(original, luminance, width, height, x, y, radius)
      const i = (y * width + x) * 4
      data[i] = clamp8(Math.round(color.r))
      data[i + 1] = clamp8(Math.round(color.g))
      data[i + 2] = clamp8(Math.round(color.b))
    }
  }
}

export const kuwaharaEffect: EffectDefinition = {
  id: 'kuwahara',
  name: 'Kuwahara',
  category: 'stylize',
  description:
    'Kant-bevarende utjevning: hver piksel får gjennomsnittsfargen fra den jevneste av fire omkringliggende kvadranter, som gir et malerisk, forenklet uttrykk uten å viske ut konturer slik en vanlig uskarphet ville gjort.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    radius: { kind: 'slider', min: 1, max: 6, step: 1, default: 3, label: 'Radius' },
  },
  createRenderer: () => createPixelEffectRenderer(applyKuwahara),
}
