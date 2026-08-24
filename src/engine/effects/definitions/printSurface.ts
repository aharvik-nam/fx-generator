import type { EffectDefinition } from '@/types'
import { clamp8 } from '../canvas2d/colorMath'
import { computeLuminanceGrid } from '../canvas2d/sobelGradient'
import {
  boxBlurField,
  generateWhiteNoiseField,
  linearToSrgb,
  srgbToLinear,
} from '../canvas2d/grainNoise'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'
import { mulberry32 } from '../../random/seededRandom'

export type SurfaceProfile = 'matte' | 'satin' | 'gloss'

export type SurfaceCharacter = {
  /** Where (0-1, in linear light) the highlight-rolloff shoulder starts compressing — matte
   * paper's narrower dynamic range starts compressing earlier than gloss's, independent of how
   * *strong* the compression is, which the Highlight roll-off slider controls directly. */
  shoulderStart: number
  /** Multiplies the paper-mottle blur radius derived from Paper texture scale — matte's texture
   * reads coarser/more fibrous at the same nominal scale, gloss's finer and tighter. */
  mottleRadiusMultiplier: number
}

/**
 * The two things the Matte/Satin/Gloss profile controls that aren't already a direct slider —
 * everything else (amount, texture scale, microcontrast, black lift, rolloff strength, warmth) is
 * a plain user-set value applied identically regardless of profile. Kept *inside* this function
 * rather than as a module-level constant, so a Recipe-exported, minified copy of
 * `applyPrintSurface` stays fully self-contained — see effectImplementations.ts's top comment.
 */
export function getSurfaceCharacter(profile: string): SurfaceCharacter {
  const characters: Record<SurfaceProfile, SurfaceCharacter> = {
    matte: { shoulderStart: 0.45, mottleRadiusMultiplier: 1.4 },
    satin: { shoulderStart: 0.6, mottleRadiusMultiplier: 1.0 },
    gloss: { shoulderStart: 0.75, mottleRadiusMultiplier: 0.6 },
  }
  return characters[profile as SurfaceProfile] ?? characters.satin
}

/**
 * A print's characteristic curve, applied in linear light: `blackLift` raises the floor (matte/
 * satin paper can't reproduce a true photographic black), then an exponential shoulder compresses
 * values above `shoulderStart` toward (but never reaching) white as `highlightRolloff` increases —
 * continuous at the shoulder boundary, so there's no visible seam between the untouched and
 * compressed parts of the curve.
 */
export function applyPrintToneCurve(
  linear01: number,
  blackLift: number,
  highlightRolloff: number,
  shoulderStart: number,
): number {
  const lifted = blackLift + linear01 * (1 - blackLift)
  if (highlightRolloff <= 0 || lifted <= shoulderStart) return lifted
  const t = (lifted - shoulderStart) / (1 - shoulderStart)
  const gain = 6 * (1 - highlightRolloff) + 0.3
  const compressed = 1 - Math.exp(-t * gain)
  return shoulderStart + compressed * (1 - shoulderStart)
}

/**
 * Simulates a print's physical surface finish rather than the image's color/tone directly:
 *
 * - `microcontrast` pushes each pixel's luminance away from a locally-blurred average (a mild
 *   "clarity"-style local-contrast boost), independent of the print's overall tone curve.
 * - `blackLift` + `highlightRolloff` (see `applyPrintToneCurve`) reproduce a paper stock's
 *   narrower dynamic range — lifted blacks, softly compressed highlights — instead of the
 *   photographic full-range curve a screen shows.
 * - A procedurally generated, seeded low-frequency noise field (never a scanned third-party
 *   texture) stands in for paper mottle, scaled by `paperTextureScale` and biased coarser/finer
 *   by the Matte/Satin/Gloss profile.
 * - `paperWarmth` adds a small warm (red-up, blue-down) tint, matching how most print stocks
 *   skew warm rather than neutral or cool.
 *
 * Every term is scaled by `surfaceAmount` and the whole effect is a no-op at `surfaceAmount` 0.
 */
export const applyPrintSurface: PixelTransform = (data, width, height, params, seed) => {
  const surfaceAmount = typeof params.surfaceAmount === 'number' ? params.surfaceAmount : 0.5
  if (surfaceAmount <= 0) return

  const paperTextureScale =
    typeof params.paperTextureScale === 'number' ? Math.max(1, params.paperTextureScale) : 6
  const microcontrast = typeof params.microcontrast === 'number' ? params.microcontrast : 0.3
  const blackLift = typeof params.blackLift === 'number' ? params.blackLift : 0.04
  const highlightRolloff =
    typeof params.highlightRolloff === 'number' ? params.highlightRolloff : 0.3
  const paperWarmth = typeof params.paperWarmth === 'number' ? params.paperWarmth : 0.15
  const profile = typeof params.profile === 'string' ? params.profile : 'satin'
  const character = getSurfaceCharacter(profile)

  const luminance = computeLuminanceGrid(data, width, height)
  const microcontrastRadius = 10
  const blurredLuminance = boxBlurField(luminance, width, height, microcontrastRadius)

  const random = mulberry32(seed)
  const mottleRadius = Math.max(1, Math.round(paperTextureScale * character.mottleRadiusMultiplier))
  const mottle = boxBlurField(
    generateWhiteNoiseField(width, height, random),
    width,
    height,
    mottleRadius,
  )

  const effectiveBlackLift = blackLift * surfaceAmount
  const effectiveRolloff = highlightRolloff * surfaceAmount
  const warmthDelta = paperWarmth * 0.08 * surfaceAmount
  const microcontrastGain = microcontrast * 0.5 * surfaceAmount
  const mottleGain = 0.035 * surfaceAmount

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const localDelta = (luminance[p] - blurredLuminance[p]) / 255
      const textureDelta = localDelta * microcontrastGain + mottle[p] * mottleGain

      const i = p * 4
      for (let channel = 0; channel < 3; channel++) {
        const linear = srgbToLinear(data[i + channel]) + textureDelta
        const toned = applyPrintToneCurve(
          Math.max(0, linear),
          effectiveBlackLift,
          effectiveRolloff,
          character.shoulderStart,
        )
        data[i + channel] = clamp8(linearToSrgb(toned))
      }
      data[i] = clamp8(data[i] + warmthDelta * 255)
      data[i + 2] = clamp8(data[i + 2] - warmthDelta * 255)
    }
  }
}

export const printSurfaceEffect: EffectDefinition = {
  id: 'print-surface',
  name: 'Papiroverflate',
  category: 'texture',
  description:
    'Simulerer en fysisk papiroverflate — Matte, Satin eller Gloss — i stedet for bildets farge/' +
    'tone direkte: mikrokontrast, løftet svart og myk høylys-kompresjon for papirets smalere ' +
    'dynamiske omfang, pluss en prosedyregenerert papirstruktur (aldri en skannet tredjeparts- ' +
    'tekstur) og en varm papirtone.',
  rendererKind: 'canvas2d',
  usesSeed: true,
  paramSchema: {
    profile: {
      kind: 'select',
      default: 'satin',
      label: 'Overflateprofil',
      options: [
        { value: 'matte', label: 'Matte' },
        { value: 'satin', label: 'Satin' },
        { value: 'gloss', label: 'Gloss' },
      ],
    },
    surfaceAmount: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      label: 'Mengde',
    },
    paperTextureScale: {
      kind: 'slider',
      min: 1,
      max: 15,
      step: 0.5,
      default: 6,
      label: 'Papirstruktur-skala',
    },
    microcontrast: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.3,
      label: 'Mikrokontrast',
    },
    blackLift: {
      kind: 'slider',
      min: 0,
      max: 0.3,
      step: 0.01,
      default: 0.04,
      label: 'Løft i svart',
    },
    highlightRolloff: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.3,
      label: 'Høylys-rolloff',
    },
    paperWarmth: {
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.15,
      label: 'Papirvarme',
    },
  },
  createRenderer: () => createPixelEffectRenderer(applyPrintSurface),
}
