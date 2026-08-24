import type { EffectDefinition } from '@/types'
import { clamp8, type Rgb } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { mulberry32 } from '../../random/seededRandom'

export function colorDistanceSq(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

export function nearestCentroidIndex(color: Rgb, centroids: Rgb[]): number {
  let best = 0
  let bestDistSq = Infinity
  for (let i = 0; i < centroids.length; i++) {
    const distSq = colorDistanceSq(color, centroids[i])
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      best = i
    }
  }
  return best
}

/**
 * k-means color clustering: seeds `k` centroids from random source pixels, then alternates
 * assigning every pixel to its nearest centroid and recomputing each centroid as the mean color
 * of its assigned pixels, for a fixed number of iterations. Unlike Posterize (which reduces
 * each channel to fixed evenly-spaced levels regardless of content), this finds the image's own
 * dominant colors. Pure and seeded; the renderer just recolors every pixel to its final nearest
 * centroid.
 */
export function computeKMeansPalette(
  data: Uint8ClampedArray,
  k: number,
  iterations: number,
  seed: number,
): Rgb[] {
  const pixelCount = data.length / 4
  const random = mulberry32(seed)
  const clampedK = Math.min(k, Math.max(1, pixelCount))

  const centroids: Rgb[] = []
  const usedIndices = new Set<number>()
  while (centroids.length < clampedK) {
    const idx = Math.floor(random() * pixelCount)
    if (usedIndices.has(idx)) continue
    usedIndices.add(idx)
    const i = idx * 4
    centroids.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }

  for (let iter = 0; iter < iterations; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    for (let p = 0; p < pixelCount; p++) {
      const i = p * 4
      const idx = nearestCentroidIndex({ r: data[i], g: data[i + 1], b: data[i + 2] }, centroids)
      const sum = sums[idx]
      sum.r += data[i]
      sum.g += data[i + 1]
      sum.b += data[i + 2]
      sum.count++
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].count > 0) {
        centroids[c] = {
          r: sums[c].r / sums[c].count,
          g: sums[c].g / sums[c].count,
          b: sums[c].b / sums[c].count,
        }
      }
    }
  }
  return centroids
}

export const applyColorQuantize: PixelTransform = (data, _width, _height, params, seed) => {
  const k = Math.max(2, Math.round(typeof params.colorCount === 'number' ? params.colorCount : 6))
  // Fixed iteration count rather than a convergence check, so runtime stays bounded regardless
  // of image content — high enough to settle on well-separated clusters in practice. Declared
  // inline (not module-level) so a Recipe-exported, minified copy of this function stays fully
  // self-contained.
  const kMeansIterations = 6
  const centroids = computeKMeansPalette(data, k, kMeansIterations, seed)

  for (let i = 0; i < data.length; i += 4) {
    const idx = nearestCentroidIndex({ r: data[i], g: data[i + 1], b: data[i + 2] }, centroids)
    data[i] = clamp8(Math.round(centroids[idx].r))
    data[i + 1] = clamp8(Math.round(centroids[idx].g))
    data[i + 2] = clamp8(Math.round(centroids[idx].b))
  }
}

export const colorQuantizeEffect: EffectDefinition = {
  id: 'color-quantize',
  name: 'Fargekvantisering',
  category: 'tone',
  description:
    'Finner bildets egne dominerende farger med k-means-klynging og erstatter hver piksel med den nærmeste — en databasert, redusert palett (i motsetning til Posterize sine faste, jevnt fordelte nivåer).',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    colorCount: { kind: 'slider', min: 2, max: 16, step: 1, default: 6, label: 'Antall farger' },
  },
  createRenderer: () => createPixelEffectRenderer(applyColorQuantize),
}
