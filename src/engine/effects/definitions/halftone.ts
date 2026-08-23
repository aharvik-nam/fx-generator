import type { EffectDefinition } from '@/types'
import { hexToRgb, relativeLuminance } from '../canvas2d/colorMath'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

/**
 * Classic dot-screen halftone: the image is replaced by a grid of solid-color dots whose radius
 * is driven by each cell's average darkness (dark cells → big dots, light cells → small/no dots).
 * Reads from a snapshot of the original pixels (`data` gets overwritten with the background
 * first) rather than the in-place `data` array, since sampling would otherwise pick up dots
 * already drawn by earlier cells.
 */
export const applyHalftone: PixelTransform = (data, width, height, params) => {
  const cellSize = Math.max(
    2,
    Math.round(typeof params.cellSize === 'number' ? params.cellSize : 10),
  )
  const dotColor = hexToRgb(typeof params.dotColor === 'string' ? params.dotColor : '#000000')
  const background = hexToRgb(typeof params.background === 'string' ? params.background : '#ffffff')
  const original = Uint8ClampedArray.from(data)

  for (let i = 0; i < data.length; i += 4) {
    data[i] = background.r
    data[i + 1] = background.g
    data[i + 2] = background.b
  }

  for (let cellY = 0; cellY < height; cellY += cellSize) {
    const cellH = Math.min(cellSize, height - cellY)
    for (let cellX = 0; cellX < width; cellX += cellSize) {
      const cellW = Math.min(cellSize, width - cellX)

      let luminanceSum = 0
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const i = ((cellY + y) * width + (cellX + x)) * 4
          luminanceSum += relativeLuminance({
            r: original[i],
            g: original[i + 1],
            b: original[i + 2],
          })
        }
      }
      const avgLuminance = luminanceSum / (cellW * cellH)
      const radius = (cellSize / 2) * (1 - avgLuminance)
      if (radius <= 0) continue

      const centerX = cellX + cellW / 2
      const centerY = cellY + cellH / 2
      const radiusSq = radius * radius
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const dx = cellX + x + 0.5 - centerX
          const dy = cellY + y + 0.5 - centerY
          if (dx * dx + dy * dy > radiusSq) continue
          const i = ((cellY + y) * width + (cellX + x)) * 4
          data[i] = dotColor.r
          data[i + 1] = dotColor.g
          data[i + 2] = dotColor.b
        }
      }
    }
  }
}

export const halftoneEffect: EffectDefinition = {
  id: 'halftone',
  name: 'Halftone',
  category: 'halftone',
  description:
    'Erstatter bildet med et rutenett av prikker i varierende størrelse, som klassisk avistrykk.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    cellSize: { kind: 'slider', min: 2, max: 40, step: 1, default: 10, label: 'Cellestørrelse' },
    dotColor: { kind: 'color', default: '#000000', label: 'Prikkfarge' },
    background: { kind: 'color', default: '#ffffff', label: 'Bakgrunn' },
  },
  createRenderer: () => createPixelEffectRenderer(applyHalftone),
}
