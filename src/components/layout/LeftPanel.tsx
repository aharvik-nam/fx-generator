import { EffectLibrary } from '@/components/editor/EffectLibrary'

export function LeftPanel() {
  return (
    <aside
      aria-label="Effektbibliotek"
      className="border-border bg-background hidden w-72 shrink-0 flex-col border-r lg:flex"
    >
      <EffectLibrary />
    </aside>
  )
}
