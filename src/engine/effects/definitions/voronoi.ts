import type { EffectDefinition } from '@/types'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { mulberry32 } from '../../random/seededRandom'

export type Point = { x: number; y: number }

export function generateSeeds(width: number, height: number, count: number, seed: number): Point[] {
  const random = mulberry32(seed)
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    points.push({ x: random() * width, y: random() * height })
  }
  return points
}

export function nearestSeedIndex(x: number, y: number, seeds: Point[]): number {
  let best = 0
  let bestDistSq = Infinity
  for (let i = 0; i < seeds.length; i++) {
    const dx = x - seeds[i].x
    const dy = y - seeds[i].y
    const distSq = dx * dx + dy * dy
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      best = i
    }
  }
  return best
}

/** Assigns every pixel to its nearest seed point (Euclidean distance) — the Voronoi cell
 * membership grid. Pure and deterministic given the same seed points. */
export function computeVoronoiAssignment(
  width: number,
  height: number,
  seeds: Point[],
): Int32Array {
  const assignment = new Int32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      assignment[y * width + x] = nearestSeedIndex(x, y, seeds)
    }
  }
  return assignment
}

/**
 * Classic Voronoi "crystallize" mosaic: recolors every pixel with the average color of its
 * cell (all the pixels nearest to the same seed point) — an irregular, cracked-mosaic look
 * instead of Halftone's regular grid or Pixelation's square blocks.
 */
export function applyVoronoiMosaic(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds: Point[],
): void {
  if (seeds.length === 0) return
  const original = Uint8ClampedArray.from(data)
  const assignment = computeVoronoiAssignment(width, height, seeds)

  const sums = seeds.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
  for (let p = 0; p < width * height; p++) {
    const cell = sums[assignment[p]]
    const i = p * 4
    cell.r += original[i]
    cell.g += original[i + 1]
    cell.b += original[i + 2]
    cell.count++
  }

  for (let p = 0; p < width * height; p++) {
    const cell = sums[assignment[p]]
    const i = p * 4
    if (cell.count === 0) continue
    data[i] = cell.r / cell.count
    data[i + 1] = cell.g / cell.count
    data[i + 2] = cell.b / cell.count
  }
}

export const applyVoronoi: PixelTransform = (data, width, height, params, seed) => {
  const cellCount = Math.max(
    2,
    Math.round(typeof params.cellCount === 'number' ? params.cellCount : 120),
  )
  const seeds = generateSeeds(width, height, cellCount, seed)
  applyVoronoiMosaic(data, width, height, seeds)
}

export const voronoiEffect: EffectDefinition = {
  id: 'voronoi',
  name: 'Voronoi-mosaikk',
  category: 'stylize',
  description:
    'Deler bildet inn i uregelmessige celler rundt tilfeldig plasserte punkter og fyller hver celle med sin gjennomsnittsfarge — som en sprukket mosaikk.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    cellCount: { kind: 'slider', min: 10, max: 300, step: 5, default: 120, label: 'Antall celler' },
  },
  createRenderer: () => createPixelEffectRenderer(applyVoronoi),
}
