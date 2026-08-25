import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBar } from '@/components/layout/StatusBar'
import { EditorView } from '@/components/editor/EditorView'
import { ShowcaseEditorView } from '@/components/showcase/ShowcaseEditorView'
import { ShowcasePreviewView } from '@/components/showcase/ShowcasePreviewView'
import { useViewStore } from '@/state/viewStore'

function App() {
  const view = useViewStore((state) => state.view)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-background text-foreground flex h-svh min-h-0 flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          Hopp til hovedinnhold
        </a>
        <TopBar />
        <div id="main-content" className="flex min-h-0 flex-1 flex-col">
          {view === 'editor' && <EditorView />}
          {view === 'showcase-editor' && <ShowcaseEditorView />}
          {view === 'showcase-preview' && <ShowcasePreviewView />}
        </div>
        <StatusBar />
      </div>
    </TooltipProvider>
  )
}

export default App
