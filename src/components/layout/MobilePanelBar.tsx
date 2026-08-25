import { Layers, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { EffectLibrary } from '@/components/editor/EffectLibrary'
import { RightPanelContent } from './RightPanel'

/**
 * On screens narrower than `lg`, LeftPanel/RightPanel (the two fixed-width asides) are hidden —
 * there isn't room for a 3-column layout. This bar gives touch users the same content through
 * slide-over sheets instead.
 */
export function MobilePanelBar() {
  return (
    <div className="border-border bg-card flex shrink-0 items-center gap-2 border-b p-2 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Sparkles aria-hidden="true" />
            Effekter
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 sm:max-w-none">
          <SheetTitle className="sr-only">Effektbibliotek</SheetTitle>
          <EffectLibrary />
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Layers aria-hidden="true" />
            Effektstakk
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 sm:max-w-none">
          <SheetTitle className="sr-only">Effektstakk og egenskaper</SheetTitle>
          <RightPanelContent />
        </SheetContent>
      </Sheet>
    </div>
  )
}
