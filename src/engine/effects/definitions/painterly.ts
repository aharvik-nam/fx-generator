import type { EffectDefinition, EffectParams, EffectRenderer } from '@/types'
import { averageColor, colorAt, rgbToHex } from '../canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../canvas2d/sobelGradient'
import { flowAngleAt } from '../canvas2d/flowField'
import { cellSeed, mulberry32 } from '../../random/seededRandom'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export type BrushStroke = { x: number; y: number; angle: number; length: number }

/**
 * Painterly brush strokes: a jittered grid of sample points, each producing one stroke. Where
 * the image has a clear edge, the stroke is rotated to run *along* that edge (perpendicular to
 * the Sobel gradient) rather than across it, the way a painter's brush follows the form instead
 * of cutting across it; flat, textureless areas fall back to the smooth flow field above. Pure
 * and seeded — geometry only, no color or drawing — so it's fully unit-testable; the renderer
 * below samples the source color at each point and turns the strokes into `ctx.stroke()` calls.
 */
export function computeBrushStrokes(
  luminance: Float32Array,
  width: number,
  height: number,
  spacing: number,
  strokeLength: number,
  seed: number,
  scale = 1,
): BrushStroke[] {
  // Below this gradient magnitude a point is considered "flat" — there's no reliable edge
  // direction to follow, so the stroke falls back to `flowAngleAt` instead of a computed one.
  // Declared inline (not module-level) so a Recipe-exported, minified copy of this function
  // stays fully self-contained.
  const flatMagnitudeThreshold = 5
  const strokes: BrushStroke[] = []

  // Each grid cell gets its own random() stream keyed by (row, col) — not one shared sequential
  // stream for the whole grid — so a cell's jitter stays the same regardless of how many other
  // cells the grid has at a given resolution (see cellSeed's doc comment).
  let row = 0
  for (let gridY = spacing / 2; gridY < height; gridY += spacing, row++) {
    let col = 0
    for (let gridX = spacing / 2; gridX < width; gridX += spacing, col++) {
      const random = mulberry32(cellSeed(seed, row, col))
      const jitterX = (random() - 0.5) * spacing * 0.6
      const jitterY = (random() - 0.5) * spacing * 0.6
      const x = Math.min(width - 1, Math.max(0, Math.round(gridX + jitterX)))
      const y = Math.min(height - 1, Math.max(0, Math.round(gridY + jitterY)))

      const gradient = sobelGradientAt(luminance, width, height, x, y)
      const angle =
        gradient.magnitude > flatMagnitudeThreshold
          ? Math.atan2(gradient.gy, gradient.gx) + Math.PI / 2
          : flowAngleAt(x, y, seed, scale)

      strokes.push({ x, y, angle, length: strokeLength * (0.7 + random() * 0.6) })
    }
  }
  return strokes
}

/** The actual drawing logic, factored out of the EffectRenderer so it can also be reused
 * verbatim (via `.toString()`) as portable, runnable code in the Recipe export. */
export function renderPainterly(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  params: EffectParams,
  seed: number,
): void {
  const scale = resolutionScaleFactor(width, height)
  const rawSpacing = typeof params.spacing === 'number' ? params.spacing : 10
  const spacing = Math.max(3, Math.round(rawSpacing * scale))
  const rawStrokeLength = typeof params.strokeLength === 'number' ? params.strokeLength : 16
  const strokeLength = rawStrokeLength * scale
  const rawStrokeWidth = typeof params.strokeWidth === 'number' ? params.strokeWidth : 3
  const strokeWidth = rawStrokeWidth * scale

  const source = ctx.getImageData(0, 0, width, height)
  const luminance = computeLuminanceGrid(source.data, width, height)
  const strokes = computeBrushStrokes(luminance, width, height, spacing, strokeLength, seed, scale)

  ctx.fillStyle = rgbToHex(averageColor(source.data))
  ctx.fillRect(0, 0, width, height)

  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  for (const stroke of strokes) {
    const dx = (Math.cos(stroke.angle) * stroke.length) / 2
    const dy = (Math.sin(stroke.angle) * stroke.length) / 2
    ctx.strokeStyle = rgbToHex(colorAt(source.data, width, stroke.x, stroke.y))
    ctx.beginPath()
    ctx.moveTo(stroke.x - dx, stroke.y - dy)
    ctx.lineTo(stroke.x + dx, stroke.y + dy)
    ctx.stroke()
  }
}

function createPainterlyRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      renderPainterly(
        surface.ctx,
        surface.canvas.width,
        surface.canvas.height,
        context.params,
        context.seed,
      )
    },
  }
}

export const painterlyEffect: EffectDefinition = {
  id: 'painterly',
  name: 'Painterly',
  category: 'stylize',
  description:
    'Male bildet på nytt som korte penselstrøk som følger konturene, i farger hentet fra originalen.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    spacing: { kind: 'slider', min: 3, max: 30, step: 1, default: 10, label: 'Tetthet' },
    strokeLength: { kind: 'slider', min: 4, max: 40, step: 1, default: 16, label: 'Strøklengde' },
    strokeWidth: { kind: 'slider', min: 1, max: 10, step: 0.5, default: 3, label: 'Strøkbredde' },
  },
  createRenderer: createPainterlyRenderer,
}
