import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../canvas2d/sobelGradient'
import {
  boxBlurField,
  generateWhiteNoiseField,
  linearToSrgb,
  shapeGrainClumps,
  srgbToLinear,
} from '../canvas2d/grainNoise'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { mulberry32 } from '../../random/seededRandom'
import { resolutionScaleFactor } from '../canvas2d/resolutionScale'

export type GrainProfile = 'fine' | 'balanced' | 'coarse'

export type GrainBandWeights = { fine: number; medium: number; coarse: number }

/**
 * How much each of the three noise bands (fine microtexture, medium, coarse clumps) contributes
 * to the final grain — the one thing the abstract Fine/Balanced/Coarse profile controls; every
 * other characteristic (scale, softness, clumping, tone response) is a direct, profile-independent
 * slider. Kept *inside* this function rather than as a module-level constant, so a Recipe-exported,
 * minified copy of `applyAnalogGrain` stays fully self-contained — see effectImplementations.ts's
 * top comment for why a shared constant can't survive minification.
 */
export function getGrainProfileWeights(profile: string): GrainBandWeights {
  const weights: Record<GrainProfile, GrainBandWeights> = {
    fine: { fine: 0.7, medium: 0.25, coarse: 0.05 },
    balanced: { fine: 0.4, medium: 0.4, coarse: 0.2 },
    coarse: { fine: 0.15, medium: 0.35, coarse: 0.5 },
  }
  return weights[profile as GrainProfile] ?? weights.balanced
}

/** How much a pixel's grain stays visible between black and white: a plateau across the
 * midtones whose taper points are pulled in from the shadow/highlight ends by the two params. */
export function tonalGrainWeight(
  luminance01: number,
  shadowEmphasis: number,
  highlightProtection: number,
): number {
  const shadowFloor = 0.35 * (1 - shadowEmphasis)
  const highlightCeiling = 1 - 0.35 * highlightProtection
  const risingFromShadows = shadowFloor > 0 ? Math.min(1, luminance01 / shadowFloor) : 1
  const fallingToHighlights =
    highlightCeiling < 1 ? Math.min(1, (1 - luminance01) / (1 - highlightCeiling)) : 1
  return Math.max(0.15, Math.min(risingFromShadows, fallingToHighlights))
}

/**
 * Procedural, multi-band analog film grain — generated fresh per render from a seed, never a
 * repeating bitmap overlay:
 *
 * - Three correlated (blurred, not independent-per-pixel) noise bands — fine, medium and coarse —
 *   mixed by weight according to the Fine/Balanced/Coarse profile, so the same controls produce a
 *   tight microtexture-led look or a chunky clump-led one from the same underlying noise.
 * - Applied as a luminance delta in *linear* light (sRGB -> linear -> add -> sRGB), so it behaves
 *   like real grain density instead of a flat offset in display space — this also means a fixed
 *   grain delta naturally reads as stronger in shadows than highlights, purely from the sRGB
 *   curve's slope, before the tonal mask below is even applied.
 * - Masked by tone (independent shadow-emphasis / highlight-protection tapers) and by local detail
 *   (a Sobel-derived mask, strength set by `detailResponse`, suppresses grain where the image
 *   already has texture, so it reads on smooth skies, walls and skin rather than piling onto
 *   already-busy edges).
 * - `colorBalance` blends from pure luminance grain toward a low-frequency, low-amplitude
 *   independent per-channel variation, approximating color film grain without becoming
 *   independent RGB sensor noise.
 *
 * Particle size is expressed in actual output pixels, so it scales correctly with export
 * resolution automatically — a size tuned for a small preview will look proportionally finer at
 * full print resolution unless it's increased to match, exactly like real film grain reads
 * differently on screen versus in print.
 */
export const applyAnalogGrain: PixelTransform = (data, width, height, params, seed) => {
  const amount = typeof params.amount === 'number' ? params.amount : 0.5
  const particleSize =
    typeof params.particleSize === 'number' ? Math.max(0.5, params.particleSize) : 2
  const softness = typeof params.softness === 'number' ? params.softness : 0.4
  const colorBalance = typeof params.colorBalance === 'number' ? params.colorBalance : 0
  const clumping = typeof params.clumping === 'number' ? params.clumping : 0.5
  const shadowEmphasis = typeof params.shadowEmphasis === 'number' ? params.shadowEmphasis : 0.5
  const highlightProtection =
    typeof params.highlightProtection === 'number' ? params.highlightProtection : 0.5
  const detailResponse = typeof params.detailResponse === 'number' ? params.detailResponse : 0.5
  const profile = typeof params.profile === 'string' ? params.profile : 'balanced'
  const weights = getGrainProfileWeights(profile)

  const luminance = computeLuminanceGrid(data, width, height)
  const random = mulberry32(seed)

  // particleSize (and every derived radius below) is scaled by canvas resolution so the same
  // param value produces the same *visual* grain regardless of the image's actual size — see
  // resolutionScale.ts. The caps are generous (not the small ~1600px-tuned ones this used before
  // scaling existed) since a box blur's cost is independent of its radius, so a large scaled-up
  // radius on a big export isn't a performance concern the way it would be for a naive blur.
  const scaledParticleSize = particleSize * resolutionScaleFactor(width, height)
  const softnessScale = 0.5 + softness * 1.5
  const fineRadius = Math.min(40, Math.round(scaledParticleSize * 0.3 * softnessScale))
  const mediumRadius = Math.min(
    120,
    Math.max(1, Math.round(scaledParticleSize * 0.8 * softnessScale)),
  )
  const coarseRadius = Math.min(
    250,
    Math.max(1, Math.round(scaledParticleSize * 1.8 * softnessScale)),
  )

  const fineNoise = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    fineRadius,
  )
  const mediumNoise = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    mediumRadius,
  )
  const coarseNoise = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    coarseRadius,
  )

  // < 1 spreads the medium/coarse bands toward their extremes so they read as discrete clumps
  // rather than smooth variation; the fine band is left unshaped since it represents microtexture.
  const clumpExponent = 1 - clumping * 0.5

  const hasColorVariance = colorBalance > 0
  const colorRadius = Math.min(400, coarseRadius * 2)
  const colorNoiseR = hasColorVariance
    ? boxBlurField(generateWhiteNoiseField(width, height, random), width, height, colorRadius)
    : null
  const colorNoiseB = hasColorVariance
    ? boxBlurField(generateWhiteNoiseField(width, height, random), width, height, colorRadius)
    : null

  const grainScale = amount * 0.12

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const luminance01 = luminance[p] / 255

      const { magnitude } = sobelGradientAt(luminance, width, height, x, y)
      const detailMask = Math.max(0.15, 1 - Math.min(1, magnitude / 200) * detailResponse)
      const toneMask = tonalGrainWeight(luminance01, shadowEmphasis, highlightProtection)

      const combined =
        weights.fine * fineNoise[p] +
        weights.medium * shapeGrainClumps(mediumNoise[p], clumpExponent) +
        weights.coarse * shapeGrainClumps(coarseNoise[p], clumpExponent)

      const strength = grainScale * toneMask * detailMask
      const delta = combined * strength

      const i = p * 4
      data[i] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i]) + delta)))
      data[i + 1] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i + 1]) + delta)))
      data[i + 2] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i + 2]) + delta)))

      if (colorNoiseR && colorNoiseB) {
        const colorDelta = strength * colorBalance * 80
        data[i] = clamp8(data[i] + colorNoiseR[p] * colorDelta)
        data[i + 2] = clamp8(data[i + 2] + colorNoiseB[p] * colorDelta)
      }
    }
  }
}

export const analogGrainEffect: EffectDefinition = {
  id: 'analog-grain',
  name: 'Analogt filmkorn',
  category: 'texture',
  description:
    'Prosedyregenerert filmkorn i tre frekvensbånd (fint, middels, grovt) — aldri en repeterende ' +
    'bitmap. Lagt til som luminans i lineært lys, og formet av uavhengige skygge-/høylys- og ' +
    'detaljmasker. Kornstørrelse er i faktiske bildepiksler, så korn oppfattes ulikt på skjerm ' +
    'og i print — juster kornstørrelsen etter eksportoppløsning og visningsstørrelse.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    profile: {
      kind: 'select',
      default: 'balanced',
      label: 'Kornprofil',
      options: [
        { value: 'fine', label: 'Fine' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'coarse', label: 'Coarse' },
      ],
    },
    amount: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Mengde' },
    particleSize: {
      kind: 'slider',
      min: 0.5,
      max: 6,
      step: 0.5,
      default: 2,
      label: 'Kornstørrelse',
    },
    softness: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.4, label: 'Mykhet' },
    colorBalance: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
      label: 'Monokrom / farge',
    },
    clumping: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Klumping' },
    shadowEmphasis: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      label: 'Skyggevekt',
    },
    highlightProtection: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      label: 'Høylysvern',
    },
    detailResponse: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      label: 'Detaljrespons',
    },
  },
  createRenderer: () => createPixelEffectRenderer(applyAnalogGrain),
}
