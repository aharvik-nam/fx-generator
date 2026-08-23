import { clamp01, relativeLuminance, type Rgb } from '../effects/canvas2d/colorMath'
import type { MaskReference } from '@/types'

function linearGradientValue(nx: number, ny: number, angleDeg: number, feather: number): number {
  const angle = (angleDeg * Math.PI) / 180
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  // Signed distance from canvas center along the gradient axis — roughly -0.5..0.5 for
  // axis-aligned angles (0/90/180/270), a bit less for diagonals.
  const projected = (nx - 0.5) * dx + (ny - 0.5) * dy
  const halfBand = Math.max(clamp01(feather), 0.001) / 2
  return clamp01(0.5 - projected / (2 * halfBand))
}

function radialGradientValue(
  nx: number,
  ny: number,
  centerX: number,
  centerY: number,
  radius: number,
  feather: number,
): number {
  const dx = nx - centerX
  const dy = ny - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const r = Math.max(radius, 0.001)
  const innerR = r * (1 - clamp01(feather))
  if (dist <= innerR) return 1
  if (dist >= r) return 0
  return clamp01((r - dist) / Math.max(r - innerR, 0.0001))
}

/**
 * Returns how much of an effect should show at a normalized (0-1) canvas coordinate: 1 = fully
 * applied, 0 = fully hidden (the base image shows through instead). `baseColor` is only needed
 * for luminosity masks, which derive their value from the underlying image's own tones.
 */
export function maskValueAt(nx: number, ny: number, mask: MaskReference, baseColor?: Rgb): number {
  switch (mask.kind) {
    case 'none':
      return 1
    case 'linear-gradient':
      return linearGradientValue(nx, ny, mask.angle, mask.feather)
    case 'radial-gradient':
      return radialGradientValue(nx, ny, mask.centerX, mask.centerY, mask.radius, mask.feather)
    case 'luminosity': {
      const luminance = baseColor ? relativeLuminance(baseColor) : 0
      return mask.invert ? 1 - luminance : luminance
    }
    case 'bitmap':
      // Not yet implemented (needs an asset-upload flow) — never selectable from the mask UI,
      // but a project loaded from a future version could still reference one. Treat as "no mask"
      // rather than silently hiding the effect.
      return 1
  }
}
