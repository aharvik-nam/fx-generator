import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/layout/TopBar'
import { EditorView } from '@/components/editor/EditorView'
import { ShowcaseEditorView } from '@/components/showcase/ShowcaseEditorView'
import { ShowcasePreviewView } from '@/components/showcase/ShowcasePreviewView'
import { useViewStore } from '@/state/viewStore'

function App() {
  const view = useViewStore((state) => state.view)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-background text-foreground flex h-svh min-h-0 flex-col">
        <TopBar />
        {view === 'editor' && <EditorView />}
        {view === 'showcase-editor' && <ShowcaseEditorView />}
        {view === 'showcase-preview' && <ShowcasePreviewView />}
      </div>
    </TooltipProvider>
  )
}

export default App
