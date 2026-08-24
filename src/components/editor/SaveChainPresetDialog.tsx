import { useId, useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChainPresetStore } from '@/state/chainPresetStore'
import type { EffectNode } from '@/types'

export function SaveChainPresetDialog({ effects }: { effects: EffectNode[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const saveAsChainPreset = useChainPresetStore((state) => state.saveAsChainPreset)
  const nameInputId = useId()

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsSaving(true)
    await saveAsChainPreset(trimmed, effects)
    setIsSaving(false)
    setOpen(false)
    setName('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setName('')
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={effects.length === 0}>
          <BookmarkPlus className="size-3.5" aria-hidden="true" />
          Lagre kjede som preset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lagre effektkjede som preset</DialogTitle>
          <DialogDescription>
            Lagrer alle {effects.length} effekt{effects.length === 1 ? '' : 'er'} i stacken —
            rekkefølge, opacity, blend mode, maske og parametere — lokalt under et navn, slik at du
            kan legge hele kombinasjonen på et annet bilde senere.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameInputId}>Navn</Label>
          <Input
            id={nameInputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Vintage film"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim()) void handleSave()
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!name.trim() || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Lagrer...' : 'Lagre preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
