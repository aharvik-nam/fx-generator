import { useEffect, useRef } from 'react'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { renderToCanvas } from '@/engine/pipeline/renderToCanvas'
import { formatMetadataExcerpt } from '@/showcase/formatMetadataExcerpt'
import type { ImageProject, ShowcaseDisplaySettings, ShowcaseState } from '@/types'

type StorySectionProps = {
  state: ShowcaseState
  sourceBitmap: ImageBitmap
  project: ImageProject
  displaySettings: ShowcaseDisplaySettings
  registerSection: (id: string, el: HTMLElement | null) => void
}

export function StorySection({
  state,
  sourceBitmap,
  project,
  displaySettings,
  registerSection,
}: StorySectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const pipeline = new RenderPipeline()
    renderToCanvas(pipeline, canvasRef.current, sourceBitmap, state.effectNodes, 'preview')
  }, [sourceBitmap, state.effectNodes])

  const enabledEffects = state.effectNodes.filter((effect) => effect.enabled)
  const metadataExcerpt = displaySettings.showMetadata
    ? formatMetadataExcerpt(project.originalMetadata)
    : null
  const recipeExcerpt = displaySettings.showRecipe ? project.recipe.aiPrompt.trim() : ''

  return (
    <section
      ref={(el) => registerSection(state.id, el)}
      data-state-id={state.id}
      className="border-border flex min-h-[85vh] flex-col items-center justify-center gap-4 border-b p-8"
    >
      <canvas
        ref={canvasRef}
        className="max-h-[55vh] max-w-full rounded-md object-contain shadow-lg"
      />

      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-semibold">{state.name}</h2>
        {state.description && <p className="text-muted-foreground">{state.description}</p>}

        {displaySettings.showParams && enabledEffects.length > 0 && (
          <ul className="text-muted-foreground flex flex-wrap justify-center gap-1.5 text-xs">
            {enabledEffects.map((effect) => (
              <li key={effect.id} className="border-border rounded-full border px-2 py-0.5">
                {effect.name}
              </li>
            ))}
          </ul>
        )}

        {metadataExcerpt && <p className="text-muted-foreground text-xs">{metadataExcerpt}</p>}

        {recipeExcerpt && (
          <p className="bg-muted/50 text-muted-foreground max-w-md rounded-md p-2 font-mono text-xs italic">
            “{recipeExcerpt}”
          </p>
        )}

        {state.notes && <p className="text-muted-foreground text-xs italic">{state.notes}</p>}
      </div>
    </section>
  )
}
