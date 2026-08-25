function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(width: number, height: number): string {
  const divisor = gcd(width, height) || 1
  return `${width / divisor}:${height / divisor}`
}

type CanvasInfoChipsProps = {
  previewBitmap: ImageBitmap
  effectCount: number
}

export function CanvasInfoChips({ previewBitmap, effectCount }: CanvasInfoChipsProps) {
  const chips = [
    simplifyRatio(previewBitmap.width, previewBitmap.height),
    `${effectCount} aktive effekt${effectCount === 1 ? '' : 'er'}`,
    `forhåndsvisning ${Math.max(previewBitmap.width, previewBitmap.height)} px`,
  ]

  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="border-border bg-card/80 text-muted-foreground rounded-md border px-2 py-1 font-mono text-xs backdrop-blur-sm"
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
