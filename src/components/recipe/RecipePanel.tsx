import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useProjectStore } from '@/state/projectStore'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { extractDominantPaletteFromCanvas } from '@/engine/color/palette'
import {
  generateRecipeMarkdown,
  formatPromptForProvider,
  suggestPromptDraft,
} from '@/export/recipeGenerator'
import { downloadBlob } from '@/export/imageExport'
import type { EffectNode, PromptProvider, PromptRecipe } from '@/types'

const EMPTY_EFFECTS: EffectNode[] = []

const PROVIDERS: { value: PromptProvider; label: string }[] = [
  { value: 'flux', label: 'Flux' },
  { value: 'sdxl', label: 'SDXL' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'gemini', label: 'Gemini' },
]

function useCopyFeedback(): [string | null, (id: string, text: string) => void] {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
  }
  return [copiedId, copy]
}

export function RecipePanel() {
  const project = useProjectStore((state) => state.project)
  const previewBitmap = useProjectStore((state) => state.assets.previewBitmap)
  const updateRecipeField = useProjectStore((state) => state.updateRecipeField)
  const pipelineRef = useRef(new RenderPipeline())
  const [palette, setPalette] = useState<string[]>([])
  const [copiedId, copy] = useCopyFeedback()

  const effects = project?.effects ?? EMPTY_EFFECTS

  useEffect(() => {
    if (!previewBitmap) return
    const canvas = pipelineRef.current.compute(previewBitmap, effects, 'preview')
    setPalette(extractDominantPaletteFromCanvas(canvas, 5))
  }, [previewBitmap, effects])

  if (!project) {
    return (
      <p className="text-muted-foreground p-3 text-sm">
        Last opp et bilde for å bygge en AI Image Recipe.
      </p>
    )
  }

  const { recipe } = project
  const generatedMarkdown = generateRecipeMarkdown(project, palette)
  const activeMarkdown = recipe.customMarkdown ?? generatedMarkdown

  function updateField<K extends keyof PromptRecipe>(key: K, value: PromptRecipe[K]) {
    updateRecipeField({ [key]: value })
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border p-2.5 text-xs">
        En AI-prompt beskriver det visuelle uttrykket, men garanterer ikke en presis reproduksjon av
        originalbildet.
      </p>

      <Tabs defaultValue="fields">
        <TabsList className="w-full">
          <TabsTrigger value="fields" className="flex-1">
            Felter
          </TabsTrigger>
          <TabsTrigger value="markdown" className="flex-1">
            Markdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="mt-3 flex flex-col gap-3">
          <RecipeTextField
            label="Motiv"
            value={recipe.subject}
            onChange={(v) => updateField('subject', v)}
          />
          <RecipeTextField
            label="Komposisjon"
            value={recipe.composition}
            onChange={(v) => updateField('composition', v)}
          />
          <RecipeTextField
            label="Lys"
            value={recipe.lighting}
            onChange={(v) => updateField('lighting', v)}
          />
          <RecipeTextField
            label="Stemning"
            value={recipe.mood}
            onChange={(v) => updateField('mood', v)}
          />
          <RecipeTextField
            label="Stilnotater"
            value={recipe.styleNotes}
            onChange={(v) => updateField('styleNotes', v)}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs font-normal">AI-prompt</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => updateField('aiPrompt', suggestPromptDraft(recipe, effects))}
              >
                <Sparkles className="size-3" aria-hidden="true" />
                Foreslå
              </Button>
            </div>
            <Textarea
              value={recipe.aiPrompt}
              onChange={(event) => updateField('aiPrompt', event.target.value)}
              rows={3}
              placeholder="a lone tree on a hill at golden hour, cinematic..."
            />
          </div>

          <RecipeTextareaField
            label="Negativ prompt"
            value={recipe.negativePrompt}
            onChange={(v) => updateField('negativePrompt', v)}
            placeholder="blurry, watermark, text..."
          />

          <RecipeTextareaField
            label="Reproduksjonsnotater"
            value={recipe.reproductionNotes}
            onChange={(v) => updateField('reproductionNotes', v)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-normal">Kopier prompt for</span>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copy(provider.value, formatPromptForProvider(recipe, provider.value))
                  }
                >
                  {copiedId === provider.value ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                  {provider.label}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="markdown" className="mt-3 flex flex-col gap-2">
          <Textarea
            value={activeMarkdown}
            onChange={(event) => updateField('customMarkdown', event.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          {recipe.customMarkdown !== undefined && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => updateField('customMarkdown', undefined)}
            >
              Tilbakestill til generert Markdown
            </Button>
          )}
        </TabsContent>
      </Tabs>

      <div className="border-border flex gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => copy('markdown', activeMarkdown)}
        >
          {copiedId === 'markdown' ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          Kopier
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() =>
            downloadBlob(new Blob([activeMarkdown], { type: 'text/markdown' }), 'recipe.md')
          }
        >
          <Download className="size-3.5" aria-hidden="true" />
          Last ned .md
        </Button>
      </div>
    </div>
  )
}

function RecipeTextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function RecipeTextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
      />
    </div>
  )
}
