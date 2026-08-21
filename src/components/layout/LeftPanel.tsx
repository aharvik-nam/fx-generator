import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

export function LeftPanel() {
  return (
    <aside
      aria-label="Effektbibliotek"
      className="border-border bg-background flex w-72 shrink-0 flex-col border-r"
    >
      <div className="border-border border-b p-3">
        <Label htmlFor="effect-search" className="sr-only">
          Søk i effekter
        </Label>
        <Input id="effect-search" type="search" placeholder="Søk i effekter..." disabled />
      </div>
      <ScrollArea className="flex-1">
        <div className="text-muted-foreground p-3 text-sm">
          Effektbiblioteket kommer i neste milepæl (M1).
        </div>
      </ScrollArea>
    </aside>
  )
}
