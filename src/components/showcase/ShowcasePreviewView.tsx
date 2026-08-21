import { ArrowLeft, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/state/projectStore'
import { useShowcaseStore } from '@/state/showcaseStore'
import { useViewStore } from '@/state/viewStore'
import { VerticalStory } from '@/showcase/scrollModes/verticalStory/VerticalStory'
import { BeforeAfterExplorer } from '@/showcase/scrollModes/beforeAfter/BeforeAfterExplorer'

function EmptyPane({ message }: { message: string }) {
  return (
    <main className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
        <PlayCircle className="size-10" aria-hidden="true" />
        <p className="max-w-sm text-sm">{message}</p>
      </div>
    </main>
  )
}

export function ShowcasePreviewView() {
  const project = useProjectStore((state) => state.project)
  const previewBitmap = useProjectStore((state) => state.assets.previewBitmap)
  const showcase = useShowcaseStore((state) => state.showcase)
  const setView = useViewStore((state) => state.setView)

  if (!project || !previewBitmap) {
    return <EmptyPane message="Last opp et bilde først." />
  }
  if (!showcase || showcase.states.length === 0) {
    return <EmptyPane message="Legg til minst én state i showcase-editoren for å forhåndsvise." />
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center gap-2 border-b p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setView('showcase-editor')}>
          <ArrowLeft aria-hidden="true" />
          Tilbake til showcase-editor
        </Button>
        <span className="text-sm font-medium">{showcase.title}</span>
      </div>

      {showcase.scrollMode === 'vertical-story' && (
        <VerticalStory showcase={showcase} project={project} sourceBitmap={previewBitmap} />
      )}
      {showcase.scrollMode === 'before-after' && (
        <BeforeAfterExplorer showcase={showcase} project={project} sourceBitmap={previewBitmap} />
      )}
      {showcase.scrollMode !== 'vertical-story' && showcase.scrollMode !== 'before-after' && (
        <EmptyPane message="Denne scrollmodusen kommer i en senere milepæl. Velg Vertical Story eller Before/After i showcase-editoren." />
      )}
    </main>
  )
}
