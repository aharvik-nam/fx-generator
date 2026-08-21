export function clamp8(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return value
}

export type Rgb = { r: number; g: number; b: number }

const DEFAULT_RGB: Rgb = { r: 0, g: 0, b: 0 }

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  if (expanded.length !== 6) return DEFAULT_RGB
  const int = Number.parseInt(expanded, 16)
  if (Number.isNaN(int)) return DEFAULT_RGB
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
