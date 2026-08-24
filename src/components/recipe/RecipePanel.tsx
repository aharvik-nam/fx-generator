import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/state/projectStore'
import { generateFullPipelineScript, generateRecipeMarkdown } from '@/export/recipeGenerator'
import { downloadBlob } from '@/export/imageExport'

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
  const [copiedId, copy] = useCopyFeedback()

  if (!project) {
    return (
      <p className="text-muted-foreground p-3 text-sm">
        Last opp et bilde for å generere en oppskrift.
      </p>
    )
  }

  const enabledEffects = project.effects.filter((effect) => effect.enabled)

  if (enabledEffects.length === 0) {
    return (
      <p className="text-muted-foreground p-3 text-sm">
        Legg til minst én effekt i effektstakken for å generere kode.
      </p>
    )
  }

  const fullScript = generateFullPipelineScript(enabledEffects)
  const markdown = generateRecipeMarkdown(project)

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border p-2.5 text-xs">
        Ekte, kjørbar JavaScript (Canvas 2D) hentet direkte fra appens egen kode — samme algoritmer
        og parameterverdier som effektkjeden din bruker akkurat nå. Ingen KI involvert. Lim rett inn
        i en nettside.
      </p>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-normal">
          Hele effektkjeden ({enabledEffects.length} effekt
          {enabledEffects.length === 1 ? '' : 'er'})
        </span>
        <pre className="border-border bg-muted/30 max-h-64 min-w-0 overflow-auto rounded-md border p-2.5 font-mono text-xs break-all whitespace-pre-wrap">
          <code>{fullScript}</code>
        </pre>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => copy('script', fullScript)}
          >
            {copiedId === 'script' ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            Kopier kode
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              downloadBlob(new Blob([fullScript], { type: 'text/javascript' }), 'effect-chain.js')
            }
          >
            <Download className="size-3.5" aria-hidden="true" />
            Last ned .js
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Trenger du en forklaring per effekt (hva den gjør, og hvordan kjøre den alene)? Full
        dokumentasjon med kodeblokk for hver enkelt effekt ligger i Markdown-versjonen under.
      </p>

      <div className="border-border flex gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => copy('markdown', markdown)}
        >
          {copiedId === 'markdown' ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          Kopier full dokumentasjon
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => downloadBlob(new Blob([markdown], { type: 'text/markdown' }), 'recipe.md')}
        >
          <Download className="size-3.5" aria-hidden="true" />
          Last ned .md
        </Button>
      </div>
    </div>
  )
}
