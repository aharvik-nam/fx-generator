import type { EffectDefinition } from '@/types'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export type SourcePoint = { srcX: number; srcY: number }

/**
 * Maps a target pixel to the source pixel that should be shown there for a mirror-symmetric
 * kaleidoscope: the angle around `(centerX, centerY)` is folded into one `2π/segments` wedge
 * and mirrored about its midline, so the same thin slice of the source image repeats, alternately
 * flipped, all the way around — the way a real kaleidoscope's mirrors repeat one wedge of glass.
 * Pure; the renderer below is the only thing that samples pixel data with the result.
 */
export function kaleidoscopeSource(
  x: number,
  y: number,
  width: number,
  height: number,
  segments: number,
  centerX: number,
  centerY: number,
  rotationRad: number,
): SourcePoint {
  const cx = centerX * width
  const cy = centerY * height
  const dx = x - cx
  const dy = y - cy
  const r = Math.hypot(dx, dy)
  const wedge = (Math.PI * 2) / segments

  let angle = Math.atan2(dy, dx) - rotationRad
  angle = ((angle % wedge) + wedge) % wedge
  if (angle > wedge / 2) angle = wedge - angle

  return { srcX: cx + r * Math.cos(angle), srcY: cy + r * Math.sin(angle) }
}

export const applyKaleidoscope: PixelTransform = (data, width, height, params) => {
  const segments = Math.max(
    2,
    Math.round(typeof params.segments === 'number' ? params.segments : 6),
  )
  const centerX = typeof params.centerX === 'number' ? params.centerX : 0.5
  const centerY = typeof params.centerY === 'number' ? params.centerY : 0.5
  const rotationRad = ((typeof params.rotation === 'number' ? params.rotation : 0) * Math.PI) / 180
  const original = Uint8ClampedArray.from(data)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { srcX, srcY } = kaleidoscopeSource(
        x,
        y,
        width,
        height,
        segments,
        centerX,
        centerY,
        rotationRad,
      )
      const sx = Math.min(width - 1, Math.max(0, Math.round(srcX)))
      const sy = Math.min(height - 1, Math.max(0, Math.round(srcY)))
      const si = (sy * width + sx) * 4
      const di = (y * width + x) * 4
      data[di] = original[si]
      data[di + 1] = original[si + 1]
      data[di + 2] = original[si + 2]
    }
  }
}

export const kaleidoscopeEffect: EffectDefinition = {
  id: 'kaleidoscope',
  name: 'Kaleidoskop',
  category: 'distortion',
  description:
    'Deler bildet inn i speilvendte kiler rundt et senterpunkt, som i et ekte kaleidoskop.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    segments: { kind: 'slider', min: 2, max: 16, step: 1, default: 6, label: 'Antall kiler' },
    centerX: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Senter X' },
    centerY: { kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5, label: 'Senter Y' },
    rotation: { kind: 'slider', min: 0, max: 360, step: 1, default: 0, label: 'Rotasjon' },
  },
  createRenderer: () => createPixelEffectRenderer(applyKaleidoscope),
}
