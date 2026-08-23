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
import { usePresetStore } from '@/state/presetStore'
import type { EffectNode } from '@/types'

export function SavePresetDialog({ effect }: { effect: EffectNode }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const saveAsPreset = usePresetStore((state) => state.saveAsPreset)
  const nameInputId = useId()

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsSaving(true)
    await saveAsPreset(trimmed, effect.type, effect.params)
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Lagre ${effect.name} som preset`}
        >
          <BookmarkPlus className="size-3.5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lagre som preset</DialogTitle>
          <DialogDescription>
            Lagrer gjeldende parametere for {effect.name} lokalt, slik at du raskt kan bruke dem
            igjen senere — på dette eller et annet bilde.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameInputId}>Navn</Label>
          <Input
            id={nameInputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${effect.name}-favoritt`}
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
