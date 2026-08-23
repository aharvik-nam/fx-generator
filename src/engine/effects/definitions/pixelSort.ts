import type { EffectDefinition } from '@/types'
import { relativeLuminance } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

type SortPixel = { r: number; g: number; b: number; a: number; luminance: number }

/** Sorts one contiguous run of pixels in row `y` (columns [start, end)) by luminance. */
function sortRun(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  start: number,
  end: number,
): void {
  if (end - start <= 1) return
  const pixels: SortPixel[] = []
  for (let x = start; x < end; x++) {
    const i = (y * width + x) * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    pixels.push({ r, g, b, a: data[i + 3], luminance: relativeLuminance({ r, g, b }) })
  }
  pixels.sort((a, b) => a.luminance - b.luminance)
  for (let x = start; x < end; x++) {
    const pixel = pixels[x - start]
    const i = (y * width + x) * 4
    data[i] = pixel.r
    data[i + 1] = pixel.g
    data[i + 2] = pixel.b
    data[i + 3] = pixel.a
  }
}

/**
 * Classic glitch-art pixel sorting: within each row, contiguous runs of pixels brighter than
 * `threshold` are sorted by luminance, producing streaky smears out of bright regions while dark
 * regions stay untouched.
 */
export const applyPixelSort: PixelTransform = (data, width, height, params) => {
  const threshold = typeof params.threshold === 'number' ? params.threshold / 100 : 0.5

  for (let y = 0; y < height; y++) {
    let runStart = -1
    for (let x = 0; x <= width; x++) {
      const isBright =
        x < width &&
        relativeLuminance({
          r: data[(y * width + x) * 4],
          g: data[(y * width + x) * 4 + 1],
          b: data[(y * width + x) * 4 + 2],
        }) > threshold
      if (isBright && runStart === -1) {
        runStart = x
      } else if (!isBright && runStart !== -1) {
        sortRun(data, width, y, runStart, x)
        runStart = -1
      }
    }
  }
}

export const pixelSortEffect: EffectDefinition = {
  id: 'pixel-sort',
  name: 'Pixel sort',
  category: 'glitch',
  description:
    'Sorterer sammenhengende lyse pikselrekker etter lyshet, og skaper strekete glitch-smøringer.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    threshold: { kind: 'slider', min: 0, max: 100, step: 1, default: 50, label: 'Terskel' },
  },
  createRenderer: () => createPixelEffectRenderer(applyPixelSort),
}
