// Maps every registered effect id to the *actual* function(s) that implement it, for the Recipe
// export (see recipeGenerator.ts). Nothing here is reimplemented or approximated: codegen calls
// `.toString()` on these live, already-running function references, so the exported code is
// guaranteed to be exactly what the app itself executes — never a hand-written, driftable copy.
//
// Every dependency here MUST be a function, never a standalone named constant. A function's
// `.name` is read live, so it always matches whatever identifier a production-minified build
// actually renamed it to — but a hardcoded constant name (e.g. `const SOBEL_X = ...`) has no such
// guarantee: minification renames the *usage site* inside the referencing function's body too,
// and a hardcoded name has no way to track that. This is why every small fixed value an effect
// needs (Bayer matrices, Sobel kernels, iteration counts, thresholds) is declared *inside* the
// function that uses it rather than shared at module scope — see sobelGradientAt, hexToRgb,
// applyOrderedDithering, computeBrushStrokes, computeParticlePositions, applyColorQuantize.
import {
  averageColor,
  clamp01,
  clamp8,
  colorAt,
  hexToRgb,
  relativeLuminance,
  rgbToHex,
} from '../engine/effects/canvas2d/colorMath'
import { computeLuminanceGrid, sobelGradientAt } from '../engine/effects/canvas2d/sobelGradient'
import { flowAngleAt } from '../engine/effects/canvas2d/flowField'
import { mulberry32 } from '../engine/random/seededRandom'
import { linearGradientValue, maskValueAt, radialGradientValue } from '../engine/mask/maskMath'

import { applyExposure } from '../engine/effects/definitions/exposure'
import { applyContrast } from '../engine/effects/definitions/contrast'
import { applyDuotone } from '../engine/effects/definitions/duotone'
import { applyFilmGrain } from '../engine/effects/definitions/filmGrain'
import {
  applyAnalogGrain,
  getGrainLookProfile,
  tonalGrainWeight,
} from '../engine/effects/definitions/analogGrain'
import {
  boxBlurField,
  generateWhiteNoiseField,
  linearToSrgb,
  shapeGrainClumps,
  srgbToLinear,
} from '../engine/effects/canvas2d/grainNoise'
import { applyVignette } from '../engine/effects/definitions/vignette'
import { applyPosterize } from '../engine/effects/definitions/posterize'
import { applyRgbChannelShift, clampIndex } from '../engine/effects/definitions/rgbChannelShift'
import { applyPixelation } from '../engine/effects/definitions/pixelation'
import { applyOrderedDithering } from '../engine/effects/definitions/orderedDithering'
import { applyHalftone } from '../engine/effects/definitions/halftone'
import { applyPixelSort, sortRun } from '../engine/effects/definitions/pixelSort'
import { applyOutline } from '../engine/effects/definitions/outline'
import { applyThreshold } from '../engine/effects/definitions/threshold'
import { computeHatchLines, renderCrossHatch } from '../engine/effects/definitions/crossHatch'
import { computeStippleDots, renderStippling } from '../engine/effects/definitions/stippling'
import { computeBrushStrokes, renderPainterly } from '../engine/effects/definitions/painterly'
import { computeFlowLines, renderFlowField } from '../engine/effects/definitions/flowField'
import {
  applyVoronoi,
  computeVoronoiAssignment,
  generateSeeds,
  nearestSeedIndex,
  applyVoronoiMosaic,
} from '../engine/effects/definitions/voronoi'
import { computeParticlePositions, renderParticles } from '../engine/effects/definitions/particles'
import {
  applyCellularAutomaton,
  buildInitialGrid,
  countLiveNeighbors,
  runGenerations,
  stepGameOfLife,
} from '../engine/effects/definitions/cellularAutomaton'
import {
  applyColorQuantize,
  colorDistanceSq,
  computeKMeansPalette,
  nearestCentroidIndex,
} from '../engine/effects/definitions/colorQuantize'
import { applyKaleidoscope, kaleidoscopeSource } from '../engine/effects/definitions/kaleidoscope'
import { applyKuwahara, kuwaharaPixel, quadrantStats } from '../engine/effects/definitions/kuwahara'
import {
  applyBlurSharpen,
  gaussianBlur,
  gaussianKernel1D,
} from '../engine/effects/definitions/blurSharpen'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => unknown

export type CodeDependency = { fn: AnyFn }

function fn(f: AnyFn): CodeDependency {
  return { fn: f }
}

const HEX_TO_RGB_DEPS: CodeDependency[] = [fn(hexToRgb)]
const SOBEL_DEPS: CodeDependency[] = [fn(sobelGradientAt)]
const LUMINANCE_GRID_DEPS: CodeDependency[] = [fn(relativeLuminance), fn(computeLuminanceGrid)]

export type EffectCodeSpec = {
  /** 'pixel' effects call `mainFn(data, width, height, params, seed)` against ImageData.
   *  'canvas' effects call `mainFn(ctx, width, height, params, seed)` and draw directly. */
  kind: 'pixel' | 'canvas'
  mainFn: AnyFn
  deps: CodeDependency[]
}

export const EFFECT_CODE_SPECS: Record<string, EffectCodeSpec> = {
  exposure: { kind: 'pixel', mainFn: applyExposure, deps: [fn(clamp8)] },
  contrast: { kind: 'pixel', mainFn: applyContrast, deps: [fn(clamp8)] },
  duotone: {
    kind: 'pixel',
    mainFn: applyDuotone,
    deps: [fn(clamp8), ...HEX_TO_RGB_DEPS, fn(relativeLuminance)],
  },
  'film-grain': { kind: 'pixel', mainFn: applyFilmGrain, deps: [fn(clamp8), fn(mulberry32)] },
  'analog-grain': {
    kind: 'pixel',
    mainFn: applyAnalogGrain,
    deps: [
      fn(clamp8),
      fn(mulberry32),
      ...LUMINANCE_GRID_DEPS,
      ...SOBEL_DEPS,
      fn(boxBlurField),
      fn(generateWhiteNoiseField),
      fn(shapeGrainClumps),
      fn(srgbToLinear),
      fn(linearToSrgb),
      fn(getGrainLookProfile),
      fn(tonalGrainWeight),
    ],
  },
  vignette: { kind: 'pixel', mainFn: applyVignette, deps: [fn(clamp01), fn(clamp8)] },
  posterize: { kind: 'pixel', mainFn: applyPosterize, deps: [fn(clamp8)] },
  'rgb-channel-shift': { kind: 'pixel', mainFn: applyRgbChannelShift, deps: [fn(clampIndex)] },
  pixelation: { kind: 'pixel', mainFn: applyPixelation, deps: [] },
  'ordered-dithering': { kind: 'pixel', mainFn: applyOrderedDithering, deps: [fn(clamp8)] },
  halftone: {
    kind: 'pixel',
    mainFn: applyHalftone,
    deps: [...HEX_TO_RGB_DEPS, fn(relativeLuminance)],
  },
  'pixel-sort': {
    kind: 'pixel',
    mainFn: applyPixelSort,
    deps: [fn(relativeLuminance), fn(sortRun)],
  },
  outline: {
    kind: 'pixel',
    mainFn: applyOutline,
    deps: [...HEX_TO_RGB_DEPS, ...LUMINANCE_GRID_DEPS, ...SOBEL_DEPS],
  },
  threshold: {
    kind: 'pixel',
    mainFn: applyThreshold,
    deps: [...HEX_TO_RGB_DEPS, fn(relativeLuminance)],
  },
  'cross-hatch': {
    kind: 'canvas',
    mainFn: renderCrossHatch,
    deps: [...LUMINANCE_GRID_DEPS, fn(computeHatchLines)],
  },
  stippling: {
    kind: 'canvas',
    mainFn: renderStippling,
    deps: [fn(clamp01), fn(mulberry32), ...LUMINANCE_GRID_DEPS, fn(computeStippleDots)],
  },
  painterly: {
    kind: 'canvas',
    mainFn: renderPainterly,
    deps: [
      fn(clamp8),
      fn(rgbToHex),
      fn(colorAt),
      fn(averageColor),
      ...LUMINANCE_GRID_DEPS,
      ...SOBEL_DEPS,
      fn(mulberry32),
      fn(flowAngleAt),
      fn(computeBrushStrokes),
    ],
  },
  'flow-field': {
    kind: 'canvas',
    mainFn: renderFlowField,
    deps: [
      fn(clamp8),
      fn(rgbToHex),
      fn(colorAt),
      fn(averageColor),
      fn(mulberry32),
      fn(flowAngleAt),
      fn(computeFlowLines),
    ],
  },
  voronoi: {
    kind: 'pixel',
    mainFn: applyVoronoi,
    deps: [
      fn(mulberry32),
      fn(generateSeeds),
      fn(nearestSeedIndex),
      fn(computeVoronoiAssignment),
      fn(applyVoronoiMosaic),
    ],
  },
  particles: {
    kind: 'canvas',
    mainFn: renderParticles,
    deps: [
      fn(clamp8),
      fn(rgbToHex),
      fn(colorAt),
      ...LUMINANCE_GRID_DEPS,
      fn(mulberry32),
      fn(computeParticlePositions),
    ],
  },
  'cellular-automaton': {
    kind: 'pixel',
    mainFn: applyCellularAutomaton,
    deps: [
      ...HEX_TO_RGB_DEPS,
      ...LUMINANCE_GRID_DEPS,
      fn(buildInitialGrid),
      fn(countLiveNeighbors),
      fn(stepGameOfLife),
      fn(runGenerations),
    ],
  },
  'color-quantize': {
    kind: 'pixel',
    mainFn: applyColorQuantize,
    deps: [
      fn(clamp8),
      fn(mulberry32),
      fn(colorDistanceSq),
      fn(nearestCentroidIndex),
      fn(computeKMeansPalette),
    ],
  },
  kaleidoscope: {
    kind: 'pixel',
    mainFn: applyKaleidoscope,
    deps: [fn(kaleidoscopeSource)],
  },
  kuwahara: {
    kind: 'pixel',
    mainFn: applyKuwahara,
    deps: [fn(clamp8), ...LUMINANCE_GRID_DEPS, fn(quadrantStats), fn(kuwaharaPixel)],
  },
  'blur-sharpen': {
    kind: 'pixel',
    mainFn: applyBlurSharpen,
    deps: [fn(clamp8), fn(gaussianKernel1D), fn(gaussianBlur)],
  },
}

/** Shared across every effect that has a mask attached — included once, regardless of how many
 * masked effects are in the chain (see generateFullPipelineScript). */
export const MASK_DEPS: CodeDependency[] = [
  fn(clamp01),
  fn(relativeLuminance),
  fn(linearGradientValue),
  fn(radialGradientValue),
  fn(maskValueAt),
]
