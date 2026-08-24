import { relativeLuminance } from './colorMath'

/** Precomputes per-pixel luminance (0-255 scale) so a Sobel pass never re-derives it, and never
 * accidentally samples pixels an effect has already overwritten. Shared by Outline (edge lines)
 * and Painterly (stroke orientation follows the local gradient direction). */
export function computeLuminanceGrid(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const luminance = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    luminance[i] = relativeLuminance({ r: data[idx], g: data[idx + 1], b: data[idx + 2] }) * 255
  }
  return luminance
}

export type Gradient = { gx: number; gy: number; magnitude: number }

/**
 * Sobel gradient at pixel (x, y) over a precomputed luminance grid, clamping at the border.
 * The two 3x3 Sobel kernels are applied as unrolled arithmetic over the 8 neighbors (the center
 * sample's coefficient is 0 in both kernels, so it's never even read) rather than an
 * array-indexed loop — this keeps the function fully self-contained with no module-level
 * constant for the Recipe code export to lose track of if this function is ever minified.
 */
export function sobelGradientAt(
  luminance: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): Gradient {
  const sampleAt = (dx: number, dy: number): number => {
    const sx = Math.min(width - 1, Math.max(0, x + dx))
    const sy = Math.min(height - 1, Math.max(0, y + dy))
    return luminance[sy * width + sx]
  }

  const topLeft = sampleAt(-1, -1)
  const top = sampleAt(0, -1)
  const topRight = sampleAt(1, -1)
  const left = sampleAt(-1, 0)
  const right = sampleAt(1, 0)
  const bottomLeft = sampleAt(-1, 1)
  const bottom = sampleAt(0, 1)
  const bottomRight = sampleAt(1, 1)

  const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight
  const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight

  return { gx, gy, magnitude: Math.sqrt(gx * gx + gy * gy) }
}
