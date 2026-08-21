import { useId } from 'react'
import { Redo2, Sparkles, Undo2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useViewStore, type AppView } from '@/state/viewStore'
import { useProjectStore } from '@/state/projectStore'

export function TopBar() {
  const view = useViewStore((state) => state.view)
  const setView = useViewStore((state) => state.setView)

  const loadImage = useProjectStore((state) => state.loadImage)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const canUndo = useProjectStore((state) => state.history.past.length > 0)
  const canRedo = useProjectStore((state) => state.history.future.length > 0)

  const uploadInputId = useId()

  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="text-primary size-5" aria-hidden="true" />
        <span>fx-generator</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="outline" size="sm" asChild>
        <label htmlFor={uploadInputId} className="cursor-pointer">
          <Upload aria-hidden="true" />
          Last opp bilde
          <input
            id={uploadInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void loadImage(file)
              event.target.value = ''
            }}
          />
        </label>
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Angre" disabled={!canUndo} onClick={undo}>
          <Undo2 aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Gjør om" disabled={!canRedo} onClick={redo}>
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
