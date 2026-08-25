import type { EffectDefinition, EffectParams, EffectRenderer } from '@/types'
import { clamp01 } from '../canvas2d/colorMath'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import { cellSeed, mulberry32 } from '../../random/seededRandom'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export type StippleDot = { x: number; y: number; radius: number }

/**
 * Stippling: unlike Halftone (a regular grid of dots whose *size* tracks darkness), stippling
 * keeps dots roughly the same size and instead varies how *many* land in each cell — darker
 * cells are more likely to get a dot, and each dot's position is jittered off the cell center —
 * for an irregular, hand-drawn ink-dot texture. Pure and seeded, so it's deterministic and
 * unit-testable without a canvas; the renderer below only turns the returned dots into
 * `ctx.arc()` fills.
 */
export function computeStippleDots(
  luminance: Float32Array,
  width: number,
  height: number,
  cellSize: number,
  density: number,
  dotSize: number,
  seed: number,
): StippleDot[] {
  const dots: StippleDot[] = []

  // Each grid cell gets its own random() stream keyed by (row, col) — not one shared sequential
  // stream for the whole grid — so a cell's accept/reject roll and jitter stay the same
  // regardless of how many other cells the grid has at a given resolution (see cellSeed's doc
  // comment).
  let row = 0
  for (let cellY = 0; cellY < height; cellY += cellSize, row++) {
    let col = 0
    for (let cellX = 0; cellX < width; cellX += cellSize, col++) {
      const random = mulberry32(cellSeed(seed, row, col))
      const sampleX = Math.min(width - 1, Math.floor(cellX + cellSize / 2))
      const sampleY = Math.min(height - 1, Math.floor(cellY + cellSize / 2))
      const darkness = 1 - luminance[sampleY * width + sampleX] / 255
      const probability = clamp01(darkness * density)
      if (random() >= probability) continue

      const jitterX = (random() - 0.5) * cellSize
      const jitterY = (random() - 0.5) * cellSize
      dots.push({
        x: cellX + cellSize / 2 + jitterX,
        y: cellY + cellSize / 2 + jitterY,
        radius: dotSize * (0.6 + random() * 0.8),
      })
    }
  }
  return dots
}

/** The actual drawing logic, factored out of the EffectRenderer so it can also be reused
 * verbatim (via `.toString()`) as portable, runnable code in the Recipe export. */
export function renderStippling(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  params: EffectParams,
  seed: number,
): void {
  const scale = resolutionScaleFactor(width, height)
  const rawCellSize = typeof params.cellSize === 'number' ? params.cellSize : 6
  const cellSize = Math.max(2, Math.round(rawCellSize * scale))
  const density = typeof params.density === 'number' ? params.density : 1.5
  const rawDotSize = typeof params.dotSize === 'number' ? params.dotSize : 1.5
  const dotSize = rawDotSize * scale
  const dotColor = typeof params.dotColor === 'string' ? params.dotColor : '#000000'
  const background = typeof params.background === 'string' ? params.background : '#ffffff'

  const source = ctx.getImageData(0, 0, width, height)
  const luminance = computeLuminanceGrid(source.data, width, height)
  const dots = computeStippleDots(luminance, width, height, cellSize, density, dotSize, seed)

  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = dotColor
  for (const dot of dots) {
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

function createStipplingRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      renderStippling(
        surface.ctx,
        surface.canvas.width,
        surface.canvas.height,
        context.params,
        context.seed,
      )
    },
  }
}

export const stipplingEffect: EffectDefinition = {
  id: 'stippling',
  name: 'Stippling',
  category: 'stylize',
  description:
    'Tegner bildet på nytt som tettpakkede blekkprikker — mørke områder får flere, tilfeldig plasserte prikker enn lyse.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    cellSize: { kind: 'slider', min: 2, max: 20, step: 1, default: 6, label: 'Cellestørrelse' },
    density: { kind: 'slider', min: 0.5, max: 3, step: 0.1, default: 1.5, label: 'Tetthet' },
    dotSize: { kind: 'slider', min: 0.5, max: 5, step: 0.1, default: 1.5, label: 'Prikkstørrelse' },
    dotColor: { kind: 'color', default: '#000000', label: 'Prikkfarge' },
    background: { kind: 'color', default: '#ffffff', label: 'Bakgrunn' },
  },
  createRenderer: createStipplingRenderer,
}
