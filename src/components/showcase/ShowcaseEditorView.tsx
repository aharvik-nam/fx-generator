import { LayoutTemplate } from 'lucide-react'

export function ShowcaseEditorView() {
  return (
    <div className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
        <LayoutTemplate className="size-10" aria-hidden="true" />
        <p className="max-w-sm text-sm">
          Showcase-editoren (states, rekkefølge, overganger) kommer i milepæl M4.
        </p>
      </div>
    </div>
  )
}
