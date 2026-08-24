import { useEffect, useId } from 'react'
import { ImagePlus, Play, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useProjectStore } from '@/state/projectStore'
import { useShowcaseStore } from '@/state/showcaseStore'
import { useViewStore } from '@/state/viewStore'
import { ShowcaseStateList } from './ShowcaseStateList'
import type { ScrollMode } from '@/types'

const SCROLL_MODE_OPTIONS: { value: ScrollMode; label: string; implemented: boolean }[] = [
  { value: 'vertical-story', label: 'Vertical Story', implemented: true },
  { value: 'before-after', label: 'Before / After', implemented: true },
  { value: 'pinned-canvas', label: 'Pinned canvas (scrollytelling)', implemented: false },
  { value: 'horizontal-gallery', label: 'Horizontal gallery', implemented: false },
  { value: 'parallax', label: 'Parallax', implemented: false },
  { value: 'free-explore', label: 'Free explore', implemented: false },
]

function EmptyPane({ message }: { message: string }) {
  return (
    <main className="bg-muted/30 flex flex-1 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
        <ImagePlus className="size-10" aria-hidden="true" />
        <p className="max-w-sm text-sm">{message}</p>
      </div>
    </main>
  )
}

function DisplayToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function ShowcaseEditorView() {
  const project = useProjectStore((state) => state.project)
  const showcase = useShowcaseStore((state) => state.showcase)
  const isSaving = useShowcaseStore((state) => state.isSaving)
  const saveError = useShowcaseStore((state) => state.saveError)
  const loadOrCreateForProject = useShowcaseStore((state) => state.loadOrCreateForProject)
  const addStateFromCurrentEditor = useShowcaseStore((state) => state.addStateFromCurrentEditor)
  const saveShowcaseNow = useShowcaseStore((state) => state.saveShowcaseNow)
  const updateTitle = useShowcaseStore((state) => state.updateTitle)
  const setScrollMode = useShowcaseStore((state) => state.setScrollMode)
  const updateTexts = useShowcaseStore((state) => state.updateTexts)
  const updateDisplaySettings = useShowcaseStore((state) => state.updateDisplaySettings)
  const setView = useViewStore((state) => state.setView)

  const titleInputId = useId()
  const introId = useId()
  const outroId = useId()

  useEffect(() => {
    if (project) void loadOrCreateForProject(project.id, project.name)
  }, [project, loadOrCreateForProject])

  if (!project) {
    return <EmptyPane message="Last opp et bilde for å bygge en showcase." />
  }
  if (!showcase) {
    return <EmptyPane message="Laster showcase..." />
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <Button type="button" size="sm" onClick={() => void addStateFromCurrentEditor()}>
          <Plus aria-hidden="true" />
          Ny state fra gjeldende redigering
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSaving}
          onClick={() => void saveShowcaseNow()}
        >
          <Save aria-hidden="true" />
          {isSaving ? 'Lagrer...' : 'Lagre showcase'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={showcase.states.length === 0}
          onClick={() => setView('showcase-preview')}
        >
          <Play aria-hidden="true" />
          Forhåndsvis
        </Button>
      </div>

      {saveError && (
        <p
          role="alert"
          className="border-border bg-destructive/10 text-destructive border-b px-3 py-2 text-sm"
        >
          {saveError}
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={titleInputId}>Tittel</Label>
              <Input
                id={titleInputId}
                value={showcase.title}
                onChange={(event) => updateTitle(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Scrollmodus</Label>
              <Select
                value={showcase.scrollMode}
                onValueChange={(value) => setScrollMode(value as ScrollMode)}
              >
                <SelectTrigger aria-label="Scrollmodus" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCROLL_MODE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={!option.implemented}
                    >
                      {option.label}
                      {!option.implemented && ' (kommer senere)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={introId}>Intro-tekst</Label>
                <Textarea
                  id={introId}
                  rows={3}
                  value={showcase.texts.intro ?? ''}
                  onChange={(event) => updateTexts({ intro: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={outroId}>Outro-tekst</Label>
                <Textarea
                  id={outroId}
                  rows={3}
                  value={showcase.texts.outro ?? ''}
                  onChange={(event) => updateTexts({ outro: event.target.value })}
                />
              </div>
            </div>

            <div className="border-border flex flex-col gap-2 rounded-md border p-3">
              <span className="text-muted-foreground text-xs font-medium">
                Vis i forhåndsvisning
              </span>
              <DisplayToggle
                label="Effektparametere"
                checked={showcase.displaySettings.showParams}
                onChange={(checked) => updateDisplaySettings({ showParams: checked })}
              />
              <DisplayToggle
                label="Metadata"
                checked={showcase.displaySettings.showMetadata}
                onChange={(checked) => updateDisplaySettings({ showMetadata: checked })}
              />
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">States ({showcase.states.length})</h2>
            <ShowcaseStateList showcase={showcase} />
          </section>
        </div>
      </ScrollArea>
    </main>
  )
}
