export function clamp8(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return value
}

export function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export type Rgb = { r: number; g: number; b: number }

/** No module-level fallback constant on purpose — see sobelGradientAt for why: a Recipe-exported,
 * minified copy of this function must stay fully self-contained. */
export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  if (expanded.length !== 6) return { r: 0, g: 0, b: 0 }
  const int = Number.parseInt(expanded, 16)
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 }
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (channel: number) => clamp8(Math.round(channel)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function colorAt(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}

export function averageColor(data: Uint8ClampedArray): Rgb {
  let r = 0
  let g = 0
  let b = 0
  const count = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return { r: r / count, g: g / count, b: b / count }
}
