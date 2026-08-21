import { PlayCircle } from 'lucide-react'

export function ShowcasePreviewView() {
  return (
    <div className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
        <PlayCircle className="size-10" aria-hidden="true" />
        <p className="max-w-sm text-sm">
          Vertical Story og Before/After-visning kommer i milepæl M4–M5.
        </p>
      </div>
    </div>
  )
}
