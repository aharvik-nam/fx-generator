/**
 * Separable box blur over a flat width*height field using a sliding window (O(1) per pixel per
 * pass regardless of radius, not O(radius)), with clamp-to-edge sampling. Used to correlate
 * independent white noise into the kind of clumpy, neighbor-influenced texture real film grain
 * has — pure per-pixel noise reads as flat static, not grain.
 */
export function boxBlurField(
  field: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius <= 0) return field.slice()
  const windowSize = radius * 2 + 1

  const horizontal = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * width
    let sum = 0
    for (let dx = -radius; dx <= radius; dx++) {
      sum += field[rowStart + Math.min(width - 1, Math.max(0, dx))]
    }
    horizontal[rowStart] = sum / windowSize
    for (let x = 1; x < width; x++) {
      const addX = Math.min(width - 1, x + radius)
      const removeX = Math.max(0, x - radius - 1)
      sum += field[rowStart + addX] - field[rowStart + removeX]
      horizontal[rowStart + x] = sum / windowSize
    }
  }

  const blurred = new Float32Array(width * height)
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let dy = -radius; dy <= radius; dy++) {
      sum += horizontal[Math.min(height - 1, Math.max(0, dy)) * width + x]
    }
    blurred[x] = sum / windowSize
    for (let y = 1; y < height; y++) {
      const addY = Math.min(height - 1, y + radius)
      const removeY = Math.max(0, y - radius - 1)
      sum += horizontal[addY * width + x] - horizontal[removeY * width + x]
      blurred[y * width + x] = sum / windowSize
    }
  }
  return blurred
}

/** White noise in [-1, 1) over a whole width*height field, from a seeded PRNG. */
export function generateWhiteNoiseField(
  width: number,
  height: number,
  random: () => number,
): Float32Array {
  const field = new Float32Array(width * height)
  for (let i = 0; i < field.length; i++) field[i] = random() * 2 - 1
  return field
}

/** Pushes a [-1, 1] value toward its extremes when `exponent` < 1, so blurred noise reads as
 * discrete grain clumps standing out against a flatter background instead of smooth variation. */
export function shapeGrainClumps(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent
}

/** sRGB (0-255) -> linear light (0-1), the standard piecewise transfer function. */
export function srgbToLinear(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Linear light (0-1) -> sRGB (0-255), the inverse of srgbToLinear. */
export function linearToSrgb(value: number): number {
  const c = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
  return c * 255
}
