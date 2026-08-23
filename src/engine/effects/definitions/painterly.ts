import type { EffectDefinition, EffectRenderer } from '@/types'
import { rgbToHex, type Rgb } from '../canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../canvas2d/sobelGradient'
import { mulberry32 } from '../../random/seededRandom'

export type BrushStroke = { x: number; y: number; angle: number; length: number }

/** Below this gradient magnitude a point is considered "flat" — there's no reliable edge
 * direction to follow, so the stroke falls back to `flowAngleAt` instead of a computed one. */
const FLAT_MAGNITUDE_THRESHOLD = 5

/**
 * A cheap position-based "flow field" — three sine waves at different frequencies/phases,
 * summed and scaled to an angle. Unlike calling `random()` per stroke (which makes neighboring
 * strokes point in wildly different directions and reads as scribbly noise), this varies
 * *smoothly* across the canvas, so nearby strokes in flat areas point roughly the same way,
 * the way a painter's brush keeps a consistent direction across a flat wash. `seed` shifts the
 * phase so different seeds still produce different-looking flows.
 */
export function flowAngleAt(x: number, y: number, seed: number): number {
  const phase = (seed % 1000) * 0.01
  const wave =
    Math.sin(x * 0.02 + phase) +
    Math.sin(y * 0.017 + phase * 1.7) +
    Math.sin((x + y) * 0.011 - phase * 0.6)
  return (wave * Math.PI) / 2
}

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
): BrushStroke[] {
  const random = mulberry32(seed)
  const strokes: BrushStroke[] = []

  for (let gridY = spacing / 2; gridY < height; gridY += spacing) {
    for (let gridX = spacing / 2; gridX < width; gridX += spacing) {
      const jitterX = (random() - 0.5) * spacing * 0.6
      const jitterY = (random() - 0.5) * spacing * 0.6
      const x = Math.min(width - 1, Math.max(0, Math.round(gridX + jitterX)))
      const y = Math.min(height - 1, Math.max(0, Math.round(gridY + jitterY)))

      const gradient = sobelGradientAt(luminance, width, height, x, y)
      const angle =
        gradient.magnitude > FLAT_MAGNITUDE_THRESHOLD
          ? Math.atan2(gradient.gy, gradient.gx) + Math.PI / 2
          : flowAngleAt(x, y, seed)

      strokes.push({ x, y, angle, length: strokeLength * (0.7 + random() * 0.6) })
    }
  }
  return strokes
}

function colorAt(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}

function averageColor(data: Uint8ClampedArray): Rgb {
  let r = 0
  let g = 0
  let b = 0
  const count = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return { r: r / count, g: g / count, b: b / count }
}

function createPainterlyRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      const { canvas, ctx } = surface
      const width = canvas.width
      const height = canvas.height
      const params = context.params
      const spacing = Math.max(
        3,
        Math.round(typeof params.spacing === 'number' ? params.spacing : 10),
      )
      const strokeLength = typeof params.strokeLength === 'number' ? params.strokeLength : 16
      const strokeWidth = typeof params.strokeWidth === 'number' ? params.strokeWidth : 3

      const source = ctx.getImageData(0, 0, width, height)
      const luminance = computeLuminanceGrid(source.data, width, height)
      const strokes = computeBrushStrokes(
        luminance,
        width,
        height,
        spacing,
        strokeLength,
        context.seed,
      )

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
