/** For tests/docs only — `resolutionScaleFactor` below does NOT read this constant (see why). */
export const RESOLUTION_SCALE_REFERENCE = 1600

/**
 * How much bigger/smaller this canvas is than a 1600px-long-edge reference image — multiply any
 * raw pixel-sized effect parameter by this before using it as an actual pixel radius/spacing/
 * offset. A canvas at the reference size gets a scale factor of 1; smaller or larger canvases
 * scale proportionally, so the same slider value produces the same *visual* result regardless of
 * the image's actual resolution — including between the app's downscaled preview bitmap (capped
 * at this same dimension, see imageLoading.ts's PREVIEW_MAX_DIMENSION) and a full-resolution
 * export of the same photo. The 1600 is inlined here rather than reading the constant above,
 * for the same reason effectImplementations.ts's top comment gives for every other effect: a
 * Recipe-exported, minified copy of this function must stay fully self-contained — referencing a
 * module-level constant would leave a dangling free variable once minification renames it.
 */
export function resolutionScaleFactor(width: number, height: number): number {
  return Math.max(width, height) / 1600
}
