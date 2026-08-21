import { ImagePlus } from 'lucide-react'

export function CanvasArea() {
  return (
    <main className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
        <ImagePlus className="size-10" aria-hidden="true" />
        <p className="max-w-xs text-sm">
          Last opp et JPG-, PNG- eller WebP-bilde for å begynne. Opplasting og live forhåndsvisning
          kommer i neste milepæl (M1).
        </p>
      </div>
    </main>
  )
}
