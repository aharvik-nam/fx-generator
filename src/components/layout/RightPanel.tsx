import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EffectStack } from '@/components/editor/EffectStack'
import { MetadataPanel } from '@/components/metadata/MetadataPanel'
import { RecipePanel } from '@/components/recipe/RecipePanel'

export function RightPanelContent() {
  return (
    <Tabs defaultValue="stack" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="m-2">
        <TabsTrigger value="stack">Effektstakk</TabsTrigger>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="recipe">Recipe</TabsTrigger>
      </TabsList>
      <ScrollArea className="min-w-0 flex-1">
        <TabsContent value="stack" className="mt-0 min-w-0">
          <EffectStack />
        </TabsContent>
        <TabsContent value="metadata" className="mt-0 min-w-0">
          <MetadataPanel />
        </TabsContent>
        <TabsContent value="recipe" className="mt-0 min-w-0">
          <RecipePanel />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}

export function RightPanel() {
  return (
    <aside
      aria-label="Effektstakk og egenskaper"
      className="border-border bg-background hidden w-80 shrink-0 flex-col border-l lg:flex"
    >
      <RightPanelContent />
    </aside>
  )
}
