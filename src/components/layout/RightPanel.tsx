import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EffectStack } from '@/components/editor/EffectStack'

export function RightPanel() {
  return (
    <aside
      aria-label="Effektstakk og egenskaper"
      className="border-border bg-background flex w-80 shrink-0 flex-col border-l"
    >
      <Tabs defaultValue="stack" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="m-2">
          <TabsTrigger value="stack">Effektstakk</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="recipe">Recipe</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="stack" className="mt-0">
            <EffectStack />
          </TabsContent>
          <TabsContent value="metadata" className="text-muted-foreground p-3 text-sm">
            Metadata-panelet kommer i M2.
          </TabsContent>
          <TabsContent value="recipe" className="text-muted-foreground p-3 text-sm">
            AI Image Recipe kommer i M3.
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
