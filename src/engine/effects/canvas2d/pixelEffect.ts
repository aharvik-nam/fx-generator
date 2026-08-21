import type { EffectParams, EffectRenderer, EffectRenderContext, RenderSurface } from '@/types'

export type PixelTransform = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: EffectParams,
  seed: number,
) => void

/** Wraps a pure pixel transform as a canvas2d EffectRenderer via getImageData/putImageData. */
export function createPixelEffectRenderer(transform: PixelTransform): EffectRenderer {
  return {
    apply(surface: RenderSurface, context: EffectRenderContext) {
      const { canvas, ctx } = surface
      const width = canvas.width
      const height = canvas.height
      const imageData = ctx.getImageData(0, 0, width, height)
      transform(imageData.data, width, height, context.params, context.seed)
      ctx.putImageData(imageData, 0, 0)
    },
  }
}
