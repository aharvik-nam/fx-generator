import type { EffectDefinition, EffectParams, EffectRenderer } from '@/types'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export type HatchLine = { x1: number; y1: number; x2: number; y2: number }

/**
 * Classic cross-hatch shading: each cell gets 0-4 line directions layered on top of each other
 * depending on how dark it is — a diagonal at 20% darkness, a crossing diagonal at 40%, then
 * horizontal at 60%, then vertical at 80% — so the densest overlap of strokes lands on the
 * darkest areas, exactly like pen-and-ink shading. Pure and deterministic (no canvas involved),
 * so it's fully unit-testable; the actual `ctx.stroke()` calls live in the renderer below.
 */
export function computeHatchLines(
  luminance: Float32Array,
  width: number,
  height: number,
  cellSize: number,
): HatchLine[] {
  const lines: HatchLine[] = []
  const half = Math.max(1, cellSize / 2 - 1)

  for (let cellY = 0; cellY < height; cellY += cellSize) {
    for (let cellX = 0; cellX < width; cellX += cellSize) {
      const cx = Math.min(width - 1, cellX + cellSize / 2)
      const cy = Math.min(height - 1, cellY + cellSize / 2)
      const sampleX = Math.min(width - 1, Math.floor(cx))
      const sampleY = Math.min(height - 1, Math.floor(cy))
      const darkness = 1 - luminance[sampleY * width + sampleX] / 255

      if (darkness > 0.2) lines.push({ x1: cx - half, y1: cy - half, x2: cx + half, y2: cy + half })
      if (darkness > 0.4) lines.push({ x1: cx - half, y1: cy + half, x2: cx + half, y2: cy - half })
      if (darkness > 0.6) lines.push({ x1: cx - half, y1: cy, x2: cx + half, y2: cy })
      if (darkness > 0.8) lines.push({ x1: cx, y1: cy - half, x2: cx, y2: cy + half })
    }
  }
  return lines
}

/** The actual drawing logic, factored out of the EffectRenderer so it can also be reused
 * verbatim (via `.toString()`) as portable, runnable code in the Recipe export. */
export function renderCrossHatch(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  params: EffectParams,
): void {
  const scale = resolutionScaleFactor(width, height)
  const rawCellSize = typeof params.cellSize === 'number' ? params.cellSize : 8
  const cellSize = Math.max(3, Math.round(rawCellSize * scale))
  const lineColor = typeof params.lineColor === 'string' ? params.lineColor : '#000000'
  const background = typeof params.background === 'string' ? params.background : '#ffffff'

  const source = ctx.getImageData(0, 0, width, height)
  const luminance = computeLuminanceGrid(source.data, width, height)
  const lines = computeHatchLines(luminance, width, height, cellSize)

  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = lineColor
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  for (const line of lines) {
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
  }
  ctx.stroke()
}

function createCrossHatchRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      renderCrossHatch(surface.ctx, surface.canvas.width, surface.canvas.height, context.params)
    },
  }
}

export const crossHatchEffect: EffectDefinition = {
  id: 'cross-hatch',
  name: 'Cross-hatch',
  category: 'stylize',
  description:
    'Skravering som i en penntegning — flere lag med linjer i ulik retning legges over hverandre jo mørkere området er.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    cellSize: { kind: 'slider', min: 3, max: 30, step: 1, default: 8, label: 'Cellestørrelse' },
    lineColor: { kind: 'color', default: '#000000', label: 'Linjefarge' },
    background: { kind: 'color', default: '#ffffff', label: 'Bakgrunn' },
  },
  createRenderer: createCrossHatchRenderer,
}
