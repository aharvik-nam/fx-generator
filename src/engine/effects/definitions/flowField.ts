import type { EffectDefinition, EffectParams, EffectRenderer } from '@/types'
import { averageColor, colorAt, rgbToHex } from '../canvas2d/colorMath'
import { flowAngleAt } from '../canvas2d/flowField'
import { mulberry32 } from '../../random/seededRandom'

export type FlowLine = { points: { x: number; y: number }[] }

/**
 * Traces a curved streamline from each jittered grid point by repeatedly stepping in the local
 * `flowAngleAt` direction — the same smooth pseudo-flow-field Painterly uses for flat areas,
 * but here it drives the whole effect instead of just a fallback. A line stops early if it
 * wanders off-canvas. Pure and seeded — geometry only; the renderer below samples color along
 * each line and turns it into a `ctx.stroke()` call.
 */
export function computeFlowLines(
  width: number,
  height: number,
  spacing: number,
  steps: number,
  stepLength: number,
  seed: number,
): FlowLine[] {
  const random = mulberry32(seed)
  const lines: FlowLine[] = []

  for (let gridY = spacing / 2; gridY < height; gridY += spacing) {
    for (let gridX = spacing / 2; gridX < width; gridX += spacing) {
      const jitterX = (random() - 0.5) * spacing * 0.6
      const jitterY = (random() - 0.5) * spacing * 0.6
      let x = Math.min(width - 1, Math.max(0, gridX + jitterX))
      let y = Math.min(height - 1, Math.max(0, gridY + jitterY))
      const points = [{ x, y }]

      for (let step = 0; step < steps; step++) {
        const angle = flowAngleAt(x, y, seed)
        x += Math.cos(angle) * stepLength
        y += Math.sin(angle) * stepLength
        if (x < 0 || x >= width || y < 0 || y >= height) break
        points.push({ x, y })
      }

      if (points.length > 1) lines.push({ points })
    }
  }
  return lines
}

/** The actual drawing logic, factored out of the EffectRenderer so it can also be reused
 * verbatim (via `.toString()`) as portable, runnable code in the Recipe export. */
export function renderFlowField(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  params: EffectParams,
  seed: number,
): void {
  const spacing = Math.max(4, Math.round(typeof params.spacing === 'number' ? params.spacing : 14))
  const steps = Math.max(2, Math.round(typeof params.steps === 'number' ? params.steps : 24))
  const stepLength = typeof params.stepLength === 'number' ? params.stepLength : 4
  const lineWidth = typeof params.lineWidth === 'number' ? params.lineWidth : 1.5

  const source = ctx.getImageData(0, 0, width, height)
  const lines = computeFlowLines(width, height, spacing, steps, stepLength, seed)

  ctx.fillStyle = rgbToHex(averageColor(source.data))
  ctx.fillRect(0, 0, width, height)

  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const line of lines) {
    const start = line.points[0]
    const sx = Math.min(width - 1, Math.max(0, Math.round(start.x)))
    const sy = Math.min(height - 1, Math.max(0, Math.round(start.y)))
    ctx.strokeStyle = rgbToHex(colorAt(source.data, width, sx, sy))
    ctx.beginPath()
    ctx.moveTo(line.points[0].x, line.points[0].y)
    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y)
    }
    ctx.stroke()
  }
}

function createFlowFieldRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      renderFlowField(
        surface.ctx,
        surface.canvas.width,
        surface.canvas.height,
        context.params,
        context.seed,
      )
    },
  }
}

export const flowFieldEffect: EffectDefinition = {
  id: 'flow-field',
  name: 'Flow field',
  category: 'stylize',
  description:
    'Tegner buede linjer som følger et jevnt, generativt strømningsfelt over hele bildet, farget fra originalen — som strømlinjer på et værkart.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    spacing: { kind: 'slider', min: 4, max: 40, step: 1, default: 14, label: 'Tetthet' },
    steps: { kind: 'slider', min: 2, max: 60, step: 1, default: 24, label: 'Linjelengde (steg)' },
    stepLength: { kind: 'slider', min: 1, max: 10, step: 0.5, default: 4, label: 'Stegstørrelse' },
    lineWidth: { kind: 'slider', min: 0.5, max: 4, step: 0.25, default: 1.5, label: 'Linjebredde' },
  },
  createRenderer: createFlowFieldRenderer,
}
