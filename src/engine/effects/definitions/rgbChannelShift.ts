import type { EffectDefinition } from '@/types'
import { createPixelEffectRenderer, type PixelTransform } from '../canvas2d/pixelEffect'

export function clampIndex(value: number, max: number): number {
  if (value < 0) return 0
  if (value > max) return max
  return value
}

export const applyRgbChannelShift: PixelTransform = (data, width, height, params) => {
  const amount = typeof params.amount === 'number' ? params.amount : 8
  const angleDeg = typeof params.angle === 'number' ? params.angle : 0
  if (amount === 0) return

  const angleRad = (angleDeg * Math.PI) / 180
  const dx = Math.round(amount * Math.cos(angleRad))
  const dy = Math.round(amount * Math.sin(angleRad))

  const source = Uint8ClampedArray.from(data)
  const maxX = width - 1
  const maxY = height - 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      const redX = clampIndex(x - dx, maxX)
      const redY = clampIndex(y - dy, maxY)
      const redIndex = (redY * width + redX) * 4
      data[i] = source[redIndex]

      const blueX = clampIndex(x + dx, maxX)
      const blueY = clampIndex(y + dy, maxY)
      const blueIndex = (blueY * width + blueX) * 4
      data[i + 2] = source[blueIndex + 2]
    }
  }
}

export const rgbChannelShiftEffect: EffectDefinition = {
  id: 'rgb-channel-shift',
  name: 'RGB channel shift',
  category: 'glitch',
  description: 'Forskyver rød- og blåkanalen i motsatte retninger for en glitch-/split-effekt.',
  rendererKind: 'canvas2d',
  usesSeed: false,
  paramSchema: {
    amount: { kind: 'slider', min: 0, max: 50, step: 1, default: 8, label: 'Mengde (px)' },
    angle: { kind: 'slider', min: 0, max: 360, step: 1, default: 0, label: 'Vinkel' },
  },
  createRenderer: () => createPixelEffectRenderer(applyRgbChannelShift),
}
