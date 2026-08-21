import { Redo2, Sparkles, Undo2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useViewStore, type AppView } from '@/state/viewStore'

export function TopBar() {
  const view = useViewStore((state) => state.view)
  const setView = useViewStore((state) => state.setView)

  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="text-primary size-5" aria-hidden="true" />
        <span>fx-generator</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="outline" size="sm">
        <Upload aria-hidden="true" />
        Last opp bilde
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Angre" disabled>
          <Undo2 aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Gjør om" disabled>
          <Redo2 aria-hidden="true" />
        </Button>
      </div>

      <div className="ml-auto">
        <Tabs value={view} onValueChange={(value) => setView(value as AppView)}>
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="showcase-editor">Showcase</TabsTrigger>
            <TabsTrigger value="showcase-preview">Forhåndsvis</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  )
}
