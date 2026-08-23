import { relativeLuminance } from './colorMath'

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

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

/** Sobel gradient at pixel (x, y) over a precomputed luminance grid, clamping at the border. */
export function sobelGradientAt(
  luminance: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): Gradient {
  let gx = 0
  let gy = 0
  for (let ky = -1; ky <= 1; ky++) {
    const sy = Math.min(height - 1, Math.max(0, y + ky))
    for (let kx = -1; kx <= 1; kx++) {
      const sx = Math.min(width - 1, Math.max(0, x + kx))
      const sample = luminance[sy * width + sx]
      const kernelIndex = (ky + 1) * 3 + (kx + 1)
      gx += sample * SOBEL_X[kernelIndex]
      gy += sample * SOBEL_Y[kernelIndex]
    }
  }
  return { gx, gy, magnitude: Math.sqrt(gx * gx + gy * gy) }
}
