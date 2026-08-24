import type { EffectDefinition, EffectParams, EffectRenderer } from '@/types'
import { colorAt, rgbToHex } from '../canvas2d/colorMath'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import { mulberry32 } from '../../random/seededRandom'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export type Particle = { x: number; y: number; radius: number }

/**
 * Rejection-sampling particle scatter: repeatedly picks a uniformly random point and accepts it
 * with probability equal to that point's brightness, so particles cluster densely in bright
 * regions and thin out in dark ones — unlike Stippling's per-cell grid (dark = dense, evenly
 * spaced), this is a free, ungridded scatter that reads as sparks or dust rather than ink dots.
 * Pure and seeded; the renderer below fills a dark background and draws each particle as a
 * source-colored dot.
 */
export function computeParticlePositions(
  luminance: Float32Array,
  width: number,
  height: number,
  count: number,
  particleSize: number,
  seed: number,
): Particle[] {
  // Below this many attempts, give up spawning further particles — protects a fully (or nearly)
  // black image, where acceptance probability is ~0, from looping forever. Declared inline (not
  // module-level) so a Recipe-exported, minified copy of this function stays fully self-contained.
  const attemptsPerParticle = 40
  const random = mulberry32(seed)
  const particles: Particle[] = []
  const maxAttempts = count * attemptsPerParticle
  let attempts = 0

  while (particles.length < count && attempts < maxAttempts) {
    attempts++
    const x = Math.floor(random() * width)
    const y = Math.floor(random() * height)
    const brightness = luminance[y * width + x] / 255
    if (random() < brightness) {
      particles.push({ x, y, radius: particleSize * (0.5 + random()) })
    }
  }
  return particles
}

/** The actual drawing logic, factored out of the EffectRenderer so it can also be reused
 * verbatim (via `.toString()`) as portable, runnable code in the Recipe export. */
export function renderParticles(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  params: EffectParams,
  seed: number,
): void {
  const count = Math.max(
    10,
    Math.round(typeof params.particleCount === 'number' ? params.particleCount : 1500),
  )
  const rawParticleSize = typeof params.particleSize === 'number' ? params.particleSize : 1.5
  const particleSize = rawParticleSize * resolutionScaleFactor(width, height)
  const background = typeof params.background === 'string' ? params.background : '#000000'

  const source = ctx.getImageData(0, 0, width, height)
  const luminance = computeLuminanceGrid(source.data, width, height)
  const particles = computeParticlePositions(luminance, width, height, count, particleSize, seed)

  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  for (const particle of particles) {
    ctx.fillStyle = rgbToHex(colorAt(source.data, width, particle.x, particle.y))
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

function createParticlesRenderer(): EffectRenderer {
  return {
    apply(surface, context) {
      renderParticles(
        surface.ctx,
        surface.canvas.width,
        surface.canvas.height,
        context.params,
        context.seed,
      )
    },
  }
}

export const particlesEffect: EffectDefinition = {
  id: 'particles',
  name: 'Partikkelsystem',
  category: 'stylize',
  description:
    'Sprer partikler tettest i bildets lyseste områder (fri, tilfeldig spredning — ikke et rutenett), farget fra originalen, på en mørk bakgrunn — som et stjernefelt eller gnister.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    particleCount: {
      kind: 'slider',
      min: 100,
      max: 4000,
      step: 50,
      default: 1500,
      label: 'Antall partikler',
    },
    particleSize: {
      kind: 'slider',
      min: 0.5,
      max: 4,
      step: 0.1,
      default: 1.5,
      label: 'Partikkelstørrelse',
    },
    background: { kind: 'color', default: '#000000', label: 'Bakgrunn' },
  },
  createRenderer: createParticlesRenderer,
}
