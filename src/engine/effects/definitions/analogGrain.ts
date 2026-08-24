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

export type GrainLook = 'fine-bw' | 'classic-400' | 'pushed-bw' | 'color-negative' | 'slide'

export type GrainLookProfile = {
  /** Multiplies the user's `size` param when deriving the blur radii for each noise layer. */
  sizeScale: number
  /** 0-1 mix of the coarse/clumped noise layer against the fine microtexture layer. */
  coarseWeight: number
  /** Exponent (<1 spreads values toward the extremes) shaping the coarse layer into clumps. */
  clumpiness: number
  /** 0-1: how far grain visibility reaches into shadows before tapering to near-black. */
  shadowReach: number
  /** 0-1: how much grain visibility rolls off approaching highlights/near-white. */
  highlightRolloff: number
  /** 0-1: amount of independent low-frequency per-channel variation (0 = pure luminance grain). */
  colorVariance: number
  /** Overall intensity multiplier for this look, on top of the user's `amount`. */
  baseAmount: number
}

/**
 * Per-look tuning kept *inside* this function rather than as a module-level constant, so a
 * Recipe-exported, minified copy of `applyAnalogGrain` stays fully self-contained — see
 * effectImplementations.ts's top comment for why a shared constant can't survive minification.
 */
export function getGrainLookProfile(look: string): GrainLookProfile {
  const profiles: Record<GrainLook, GrainLookProfile> = {
    'fine-bw': {
      sizeScale: 0.7,
      coarseWeight: 0.15,
      clumpiness: 0.85,
      shadowReach: 0.5,
      highlightRolloff: 0.6,
      colorVariance: 0,
      baseAmount: 0.7,
    },
    'classic-400': {
      sizeScale: 1,
      coarseWeight: 0.35,
      clumpiness: 0.7,
      shadowReach: 0.65,
      highlightRolloff: 0.55,
      colorVariance: 0,
      baseAmount: 1,
    },
    'pushed-bw': {
      sizeScale: 1.6,
      coarseWeight: 0.55,
      clumpiness: 0.55,
      shadowReach: 0.9,
      highlightRolloff: 0.35,
      colorVariance: 0,
      baseAmount: 1.4,
    },
    'color-negative': {
      sizeScale: 1,
      coarseWeight: 0.3,
      clumpiness: 0.75,
      shadowReach: 0.55,
      highlightRolloff: 0.7,
      colorVariance: 0.35,
      baseAmount: 0.9,
    },
    slide: {
      sizeScale: 0.55,
      coarseWeight: 0.1,
      clumpiness: 0.9,
      shadowReach: 0.45,
      highlightRolloff: 0.75,
      colorVariance: 0.1,
      baseAmount: 0.55,
    },
  }
  return profiles[look as GrainLook] ?? profiles['classic-400']
}

/** How much a pixel's grain stays visible between black and white: a plateau across the
 * midtones whose taper points come from the look profile (pushed film reaches further into
 * shadows before fading; color negative rolls off sooner at both ends). */
export function tonalGrainWeight(
  luminance01: number,
  shadowReach: number,
  highlightRolloff: number,
): number {
  const shadowFloor = 0.35 * (1 - shadowReach)
  const highlightCeiling = 1 - 0.35 * highlightRolloff
  const risingFromShadows = shadowFloor > 0 ? Math.min(1, luminance01 / shadowFloor) : 1
  const fallingToHighlights =
    highlightCeiling < 1 ? Math.min(1, (1 - luminance01) / (1 - highlightCeiling)) : 1
  return Math.max(0.15, Math.min(risingFromShadows, fallingToHighlights))
}

/**
 * A more analog-accurate film grain than `applyFilmGrain`'s flat per-block static:
 *
 * - Two correlated noise layers (blurred, not independent per pixel) mixed together — a fine
 *   one for microtexture, a coarser one shaped into discrete clumps for organic variation.
 * - Applied as a luminance delta in *linear* light (sRGB -> linear -> add -> sRGB), so it
 *   behaves like real grain density instead of a flat offset in display space — this also means
 *   a fixed grain delta naturally reads as stronger in shadows than highlights, purely from the
 *   sRGB curve's slope, before any tonal shaping is even applied.
 * - Masked by tone (a per-look shadow/highlight taper) and by local detail (a Sobel-derived
 *   mask suppresses grain where the image already has texture, so it reads on smooth skies,
 *   walls and skin rather than piling onto already-busy edges).
 * - An optional low-frequency, low-amplitude per-channel variation (color negative/slide looks)
 *   approximates color film grain without becoming independent RGB sensor noise.
 */
export const applyAnalogGrain: PixelTransform = (data, width, height, params, seed) => {
  const amount = typeof params.amount === 'number' ? params.amount : 0.5
  const size = typeof params.size === 'number' ? Math.max(0.5, params.size) : 2
  const look = typeof params.look === 'string' ? params.look : 'classic-400'
  const profile = getGrainLookProfile(look)

  const luminance = computeLuminanceGrid(data, width, height)
  const random = mulberry32(seed)

  const scaledSize = size * profile.sizeScale
  const fineRadius = Math.min(3, Math.round(scaledSize * 0.3))
  const coarseRadius = Math.min(10, Math.max(1, Math.round(scaledSize * 1.2)))

  const fineNoise = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    fineRadius,
  )
  const coarseNoise = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    coarseRadius,
  )

  const hasColorVariance = profile.colorVariance > 0
  const colorRadius = Math.min(20, coarseRadius * 2)
  const colorNoiseR = hasColorVariance
    ? boxBlurField(generateWhiteNoiseField(width, height, random), width, height, colorRadius)
    : null
  const colorNoiseB = hasColorVariance
    ? boxBlurField(generateWhiteNoiseField(width, height, random), width, height, colorRadius)
    : null

  const grainScale = amount * profile.baseAmount * 0.12

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const luminance01 = luminance[p] / 255

      const { magnitude } = sobelGradientAt(luminance, width, height, x, y)
      const detailMask = Math.max(0.15, 1 - Math.min(1, magnitude / 200) * 0.85)
      const toneMask = tonalGrainWeight(luminance01, profile.shadowReach, profile.highlightRolloff)

      const combined =
        (1 - profile.coarseWeight) * fineNoise[p] +
        profile.coarseWeight * shapeGrainClumps(coarseNoise[p], profile.clumpiness)

      const strength = grainScale * toneMask * detailMask
      const delta = combined * strength

      const i = p * 4
      data[i] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i]) + delta)))
      data[i + 1] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i + 1]) + delta)))
      data[i + 2] = clamp8(linearToSrgb(Math.max(0, srgbToLinear(data[i + 2]) + delta)))

      if (colorNoiseR && colorNoiseB) {
        const colorDelta = strength * profile.colorVariance * 80
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
    'Korrelert, flerlags filmkorn (fint mikrokorn + grovere organiske klumper) lagt til som ' +
    'luminans i lineært lys og dempet der bildet allerede har detalj — mer likt ekte analog ' +
    'kornstruktur enn jevn støy.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    look: {
      kind: 'select',
      default: 'classic-400',
      label: 'Filmtype',
      options: [
        { value: 'fine-bw', label: 'Fin S/H (ISO 100)' },
        { value: 'classic-400', label: 'Klassisk 400-film' },
        { value: 'pushed-bw', label: 'Presset rask S/H' },
        { value: 'color-negative', label: 'Fargenegativ' },
        { value: 'slide', label: 'Dias/slide' },
      ],
    },
    amount: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Mengde' },
    size: { kind: 'slider', min: 0.5, max: 6, step: 0.5, default: 2, label: 'Kornstørrelse' },
  },
  createRenderer: () => createPixelEffectRenderer(applyAnalogGrain),
}
