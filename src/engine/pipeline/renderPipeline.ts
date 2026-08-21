import type { BlendMode, EffectNode, RenderQuality } from '@/types'
import { getEffectDefinition } from '../effects/registry'
import { blendModeToCompositeOperation } from '../color/blend'

type CacheEntry = {
  signature: string
  canvas: OffscreenCanvas
}

function signatureFor(node: EffectNode): string {
  return JSON.stringify([
    node.type,
    node.enabled,
    node.opacity,
    node.blendMode,
    node.params,
    node.seed ?? null,
    node.mask ?? null,
  ])
}

function bitmapToCanvas(bitmap: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D-kontekst er ikke tilgjengelig for OffscreenCanvas.')
  ctx.drawImage(bitmap, 0, 0)
  return canvas
}

function cloneCanvas(source: OffscreenCanvas): OffscreenCanvas {
  const clone = new OffscreenCanvas(source.width, source.height)
  const ctx = clone.getContext('2d')
  if (!ctx) throw new Error('2D-kontekst er ikke tilgjengelig for OffscreenCanvas.')
  ctx.drawImage(source, 0, 0)
  return clone
}

function applyEffectToCanvas(
  canvas: OffscreenCanvas,
  node: EffectNode,
  quality: RenderQuality,
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D-kontekst er ikke tilgjengelig for OffscreenCanvas.')
  const definition = getEffectDefinition(node.type)
  const renderer = definition.createRenderer()
  renderer.apply(
    { canvas, ctx },
    { params: node.params, seed: node.seed ?? 0, quality, mask: node.mask },
  )
}

function compositeLayer(
  base: OffscreenCanvas,
  layer: OffscreenCanvas,
  opacity: number,
  blendMode: BlendMode,
): OffscreenCanvas {
  const result = new OffscreenCanvas(base.width, base.height)
  const ctx = result.getContext('2d')
  if (!ctx) throw new Error('2D-kontekst er ikke tilgjengelig for OffscreenCanvas.')
  ctx.drawImage(base, 0, 0)
  ctx.globalAlpha = opacity
  ctx.globalCompositeOperation = blendModeToCompositeOperation(blendMode)
  ctx.drawImage(layer, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  return result
}

/**
 * Composites an effect chain onto a target canvas. Keeps one cached canvas snapshot per
 * chain-prefix (`entries[i]` = state after applying `effects[0..i-1]`), and on each render
 * only recomputes from the first index whose node signature changed — an edit deep in a long
 * stack doesn't re-run every effect before it.
 */
export class RenderPipeline {
  private cacheEntries: CacheEntry[] = []
  private cachedSource: ImageBitmap | null = null

  render(
    target: HTMLCanvasElement,
    source: ImageBitmap,
    effects: EffectNode[],
    quality: RenderQuality = 'preview',
  ): void {
    if (source !== this.cachedSource || this.cacheEntries.length === 0) {
      this.cacheEntries = [{ signature: '__source__', canvas: bitmapToCanvas(source) }]
      this.cachedSource = source
    }

    let dirtyIndex = 1
    while (
      dirtyIndex <= effects.length &&
      dirtyIndex < this.cacheEntries.length &&
      this.cacheEntries[dirtyIndex].signature === signatureFor(effects[dirtyIndex - 1])
    ) {
      dirtyIndex++
    }
    this.cacheEntries.length = dirtyIndex

    for (let i = dirtyIndex; i <= effects.length; i++) {
      const node = effects[i - 1]
      const base = this.cacheEntries[i - 1].canvas
      let resultCanvas: OffscreenCanvas
      if (node.enabled) {
        const layer = cloneCanvas(base)
        applyEffectToCanvas(layer, node, quality)
        resultCanvas = compositeLayer(base, layer, node.opacity, node.blendMode)
      } else {
        resultCanvas = cloneCanvas(base)
      }
      this.cacheEntries.push({ signature: signatureFor(node), canvas: resultCanvas })
    }

    const finalCanvas = this.cacheEntries[effects.length].canvas
    target.width = finalCanvas.width
    target.height = finalCanvas.height
    const ctx = target.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, target.width, target.height)
    ctx.drawImage(finalCanvas, 0, 0)
  }

  reset(): void {
    this.cacheEntries = []
    this.cachedSource = null
  }
}
