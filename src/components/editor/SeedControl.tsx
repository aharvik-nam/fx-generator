import { useId } from 'react'
import { Dices } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjectStore } from '@/state/projectStore'
import type { EffectNode } from '@/types'

/** Shown for any generative effect (`definition.usesSeed`) so the noise pattern is both visible
 * and reproducible — direct entry to pin an exact pattern, or reroll for a fresh one. */
export function SeedControl({ effect }: { effect: EffectNode }) {
  const setEffectSeed = useProjectStore((state) => state.setEffectSeed)
  const rerollEffectSeed = useProjectStore((state) => state.rerollEffectSeed)
  const id = useId()

  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        Seed
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="number"
          value={effect.seed ?? 0}
          className="h-7 w-24 text-right font-mono text-xs"
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (!Number.isNaN(parsed)) setEffectSeed(effect.id, parsed)
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Nytt tilfeldig seed for ${effect.name}`}
          onClick={() => rerollEffectSeed(effect.id)}
        >
          <Dices className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
