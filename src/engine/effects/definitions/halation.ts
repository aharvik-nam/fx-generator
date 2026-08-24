import type { EffectDefinition } from '@/types'
import { clamp01, clamp8, hslToRgb } from '../canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../canvas2d/sobelGradient'
import { boxBlurField, linearToSrgb, srgbToLinear } from '../canvas2d/grainNoise'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/**
 * A soft-knee highlight extraction (the same shape a compressor's knee uses): 0 well below
 * `threshold`, ramping smoothly through a `softKnee`-wide band centered on it, 1 well above —
 * then weighted by the luminance itself, so a pixel just past the knee glows far less than one
 * near full white. This avoids the hard, banding-prone cutoff a plain `luminance > threshold`
 * test would produce.
 */
export function highlightMaskAt(luminance01: number, threshold: number, softKnee: number): number {
  const knee = Math.max(0.001, softKnee)
  const t = clamp01((luminance01 - (threshold - knee)) / (2 * knee))
  const smoothed = t * t * (3 - 2 * t)
  return smoothed * luminance01
}

/**
 * Halation — the warm glow around bright highlights caused by light scattering back through
 * film's emulsion and base (classic on tungsten-lit night scenes, neon signs, practical lights).
 * Not a generic bloom: the glow's source is a soft-knee highlight mask (not a raw copy of the
 * highlight's own color), separably box-blurred, tinted to a fixed hue/saturation, and screen-
 * composited in linear light. `edgePreservation` keeps the glow from bleeding indiscriminately
 * across strong scene edges by blending toward a much tighter blur radius wherever the Sobel
 * gradient is strong, so it reads as light wrapping a source rather than a uniform haze.
 */
export const applyHalation: PixelTransform = (data, width, height, params) => {
  const amount = typeof params.amount === 'number' ? params.amount : 0.4
  const radius = typeof params.radius === 'number' ? Math.max(1, params.radius) : 18
  const threshold = typeof params.threshold === 'number' ? params.threshold : 0.75
  const softKnee = typeof params.softKnee === 'number' ? params.softKnee : 0.15
  const hue = typeof params.hue === 'number' ? params.hue : 25
  const saturation = typeof params.saturation === 'number' ? params.saturation : 0.7
  const edgePreservation =
    typeof params.edgePreservation === 'number' ? params.edgePreservation : 0.5

  if (amount <= 0) return

  const luminance = computeLuminanceGrid(data, width, height)

  const mask = new Float32Array(width * height)
  for (let p = 0; p < mask.length; p++) {
    mask[p] = highlightMaskAt(luminance[p] / 255, threshold, softKnee)
  }

  const softRadius = Math.round(radius)
  const tightRadius = Math.max(1, Math.round(radius * 0.25))
  const softBlur = boxBlurField(mask, width, height, softRadius)
  const tightBlur = boxBlurField(mask, width, height, tightRadius)

  const tint = hslToRgb(hue, saturation, 0.5)
  const tintR = tint.r / 255
  const tintG = tint.g / 255
  const tintB = tint.b / 255

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x

      const { magnitude } = sobelGradientAt(luminance, width, height, x, y)
      const edgeStrength = clamp01(magnitude / 300)
      const tightBlend = edgeStrength * edgePreservation
      const glowMask = softBlur[p] * (1 - tightBlend) + tightBlur[p] * tightBlend

      const strength = glowMask * amount
      const glowR = tintR * strength
      const glowG = tintG * strength
      const glowB = tintB * strength

      const i = p * 4
      const baseR = srgbToLinear(data[i])
      const baseG = srgbToLinear(data[i + 1])
      const baseB = srgbToLinear(data[i + 2])
      data[i] = clamp8(linearToSrgb(1 - (1 - baseR) * (1 - glowR)))
      data[i + 1] = clamp8(linearToSrgb(1 - (1 - baseG) * (1 - glowG)))
      data[i + 2] = clamp8(linearToSrgb(1 - (1 - baseB) * (1 - glowB)))
    }
  }
}

export const halationEffect: EffectDefinition = {
  id: 'halation',
  name: 'Halation',
  category: 'tone',
  description:
    'Varm glød rundt sterke høylys, som lys som spres tilbake gjennom filmens emulsjon og base — ' +
    'ikke en generell bloom. En myk terskel plukker ut høylysene, blures separat, tones til en ' +
    'valgt fargetone, og legges til som lys i lineært rom. Kantbevaring holder gløden nær kilden ' +
    'sin i stedet for å spre seg jevnt over hele bildet. Sett Mengde til 0 for å skru av.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    amount: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.4, label: 'Mengde' },
    radius: { kind: 'slider', min: 1, max: 80, step: 1, default: 18, label: 'Radius' },
    threshold: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.75, label: 'Terskel' },
    softKnee: {
      kind: 'slider',
      min: 0.01,
      max: 0.5,
      step: 0.01,
      default: 0.15,
      label: 'Myk overgang',
    },
    hue: { kind: 'slider', min: 0, max: 360, step: 1, default: 25, label: 'Fargetone' },
    saturation: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.7, label: 'Metning' },
    edgePreservation: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      label: 'Kantbevaring',
    },
  },
  createRenderer: () => createPixelEffectRenderer(applyHalation),
}
