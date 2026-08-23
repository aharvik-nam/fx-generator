import type { EffectDefinition } from '@/types'
import { hexToRgb } from '../canvas2d/colorMath'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/** Downsamples the image into a `cols` x `rows` grid of cells, each "alive" if its average
 * luminance is darker than `threshold` — the starting generation for the automaton. */
export function buildInitialGrid(
  luminance: Float32Array,
  width: number,
  height: number,
  cols: number,
  rows: number,
  cellSize: number,
  threshold: number,
): boolean[] {
  const grid: boolean[] = Array.from({ length: cols * rows }, () => false)
  for (let cy = 0; cy < rows; cy++) {
    const y0 = cy * cellSize
    const y1 = Math.min(height, y0 + cellSize)
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cellSize
      const x1 = Math.min(width, x0 + cellSize)
      let sum = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += luminance[y * width + x]
          n++
        }
      }
      const avg = n > 0 ? sum / n : 255
      grid[cy * cols + cx] = avg < threshold
    }
  }
  return grid
}

function countLiveNeighbors(
  grid: boolean[],
  cols: number,
  rows: number,
  cx: number,
  cy: number,
): number {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
      if (grid[ny * cols + nx]) count++
    }
  }
  return count
}

/** One step of Conway's Game of Life (classic B3/S23 rules), clamped — not wrapping — at the
 * grid border. Pure and side-effect-free, so a run is just repeated calls to this. */
export function stepGameOfLife(grid: boolean[], cols: number, rows: number): boolean[] {
  const next = Array.from({ length: cols * rows }, () => false)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const alive = grid[cy * cols + cx]
      const neighbors = countLiveNeighbors(grid, cols, rows, cx, cy)
      next[cy * cols + cx] = alive ? neighbors === 2 || neighbors === 3 : neighbors === 3
    }
  }
  return next
}

export function runGenerations(
  grid: boolean[],
  cols: number,
  rows: number,
  generations: number,
): boolean[] {
  let current = grid
  for (let i = 0; i < generations; i++) current = stepGameOfLife(current, cols, rows)
  return current
}

/**
 * Reads the image's dark regions as a Game of Life starting pattern, runs it forward a fixed
 * number of generations, then paints the result back as solid cells — a deterministic (no
 * randomness) way to let a simple emergent rule reinterpret the image's shapes.
 */
export const applyCellularAutomaton: PixelTransform = (data, width, height, params) => {
  const cellSize = Math.max(
    2,
    Math.round(typeof params.cellSize === 'number' ? params.cellSize : 10),
  )
  const generations = Math.max(
    0,
    Math.round(typeof params.generations === 'number' ? params.generations : 4),
  )
  const threshold = typeof params.threshold === 'number' ? params.threshold : 128
  const liveColor = hexToRgb(typeof params.liveColor === 'string' ? params.liveColor : '#000000')
  const deadColor = hexToRgb(typeof params.deadColor === 'string' ? params.deadColor : '#ffffff')

  const luminance = computeLuminanceGrid(data, width, height)
  const cols = Math.ceil(width / cellSize)
  const rows = Math.ceil(height / cellSize)
  const initial = buildInitialGrid(luminance, width, height, cols, rows, cellSize, threshold)
  const finalGrid = runGenerations(initial, cols, rows, generations)

  for (let cy = 0; cy < rows; cy++) {
    const y0 = cy * cellSize
    const y1 = Math.min(height, y0 + cellSize)
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cellSize
      const x1 = Math.min(width, x0 + cellSize)
      const color = finalGrid[cy * cols + cx] ? liveColor : deadColor
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4
          data[i] = color.r
          data[i + 1] = color.g
          data[i + 2] = color.b
        }
      }
    }
  }
}

export const cellularAutomatonEffect: EffectDefinition = {
  id: 'cellular-automaton',
  name: 'Celleautomat',
  category: 'stylize',
  description:
    'Leser bildets mørke områder som et startmønster for "Game of Life" og lar det utvikle seg et gitt antall generasjoner før resultatet males tilbake som faste celler.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    cellSize: { kind: 'slider', min: 3, max: 30, step: 1, default: 10, label: 'Cellestørrelse' },
    generations: { kind: 'slider', min: 0, max: 15, step: 1, default: 4, label: 'Generasjoner' },
    threshold: { kind: 'slider', min: 0, max: 255, step: 5, default: 128, label: 'Terskel' },
    liveColor: { kind: 'color', default: '#000000', label: 'Levende celler' },
    deadColor: { kind: 'color', default: '#ffffff', label: 'Døde celler' },
  },
  createRenderer: () => createPixelEffectRenderer(applyCellularAutomaton),
}
