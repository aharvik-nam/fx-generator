import { getEffectDefinition } from '@/engine/effects/registry'
import type {
  EffectNode,
  EffectParams,
  ImageProject,
  ParamSchemaEntry,
  PromptProvider,
  PromptRecipe,
} from '@/types'

const METADATA_POLICY_LABEL: Record<ImageProject['exportSettings']['metadataPolicy'], string> = {
  'strip-all': 'removed on export',
  'strip-sensitive': 'sensitive fields removed on export',
  'keep-all': 'kept on export',
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

// Param schema `label` fields are localized for the editor UI (e.g. Norwegian "Skygger"), but
// this document is English throughout — so field names are derived from the (English,
// camelCase) param key instead of the UI label, which would otherwise leak the UI's language
// into an AI-prompt-facing document.
function humanizeParamKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatParamValue(
  value: EffectParams[string],
  schema: ParamSchemaEntry | undefined,
): string {
  if (!schema) return String(value)
  switch (schema.kind) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'select': {
      const option = schema.options.find((candidate) => candidate.value === value)
      return option?.label ?? String(value)
    }
    case 'color':
      return String(value)
    case 'slider':
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value)
  }
}

function formatEffectEntry(effect: EffectNode, index: number): string {
  const definition = getEffectDefinition(effect.type)
  const lines = [`${index + 1}. ${effect.name}${effect.enabled ? '' : ' (disabled)'}`]

  for (const [key, value] of Object.entries(effect.params)) {
    const schema = definition.paramSchema[key]
    lines.push(`   - ${humanizeParamKey(key)}: ${formatParamValue(value, schema)}`)
  }
  lines.push(`   - Opacity: ${Math.round(effect.opacity * 100)}%`)
  if (effect.blendMode !== 'normal') lines.push(`   - Blend mode: ${effect.blendMode}`)
  if (effect.seed !== undefined) lines.push(`   - Seed: ${effect.seed}`)

  return lines.join('\n')
}

function formatEffectPipeline(effects: EffectNode[]): string {
  if (effects.length === 0) return '_No effects applied._'
  return effects.map(formatEffectEntry).join('\n\n')
}

function orDefault(value: string, fallback: string): string {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

/**
 * Builds the AI Image Recipe markdown from a project's technical data (source, metadata,
 * effect pipeline — auto-filled) and its user-authored fields (subject, composition, lighting,
 * mood, style, prompts — never invented on the user's behalf). English throughout: this
 * document is meant to be pasted into Flux/SDXL/Midjourney/Gemini, which work far better with
 * English prompts, even though the rest of the app UI is Norwegian.
 */
export function generateRecipeMarkdown(project: ImageProject, palette: string[]): string {
  const { originalMetadata, recipe, effects, exportSettings } = project
  const lines: string[] = ['# Image Recipe', '', '## Source']

  lines.push(`- Original: \`${originalMetadata.fileName}\``)
  lines.push(
    `- Dimensions: ${originalMetadata.dimensions.width} × ${originalMetadata.dimensions.height} px`,
  )
  lines.push(`- Orientation: ${originalMetadata.orientation}`)
  const cameraLabel = [originalMetadata.camera?.make, originalMetadata.camera?.model]
    .filter(Boolean)
    .join(' ')
  if (cameraLabel) lines.push(`- Camera: ${cameraLabel}`)
  if (originalMetadata.lens?.model) lines.push(`- Lens: ${originalMetadata.lens.model}`)
  if (originalMetadata.captureDate)
    lines.push(`- Date: ${originalMetadata.captureDate.slice(0, 10)}`)
  lines.push(`- Metadata policy: ${METADATA_POLICY_LABEL[exportSettings.metadataPolicy]}`)

  lines.push('', '## Visual description')
  lines.push(`- Subject: ${orDefault(recipe.subject, '_not specified_')}`)
  lines.push(`- Composition: ${orDefault(recipe.composition, '_not specified_')}`)
  lines.push(`- Lighting: ${orDefault(recipe.lighting, '_not specified_')}`)
  lines.push(`- Mood: ${orDefault(recipe.mood, '_not specified_')}`)
  lines.push(`- Colour palette: ${palette.length > 0 ? palette.join(', ') : '_not available_'}`)
  lines.push(`- Style: ${orDefault(recipe.styleNotes, '_not specified_')}`)

  lines.push('', '## Effect pipeline', formatEffectPipeline(effects))

  lines.push('', '## AI prompt', orDefault(recipe.aiPrompt, '_not specified_'))
  lines.push('', '## Negative prompt', orDefault(recipe.negativePrompt, '_not specified_'))
  lines.push(
    '',
    '## Reproduction notes',
    orDefault(
      recipe.reproductionNotes,
      'An AI prompt describes the visual expression but does not guarantee a precise reproduction of the original image.',
    ),
  )

  return lines.join('\n')
}

/**
 * Adapts the base AI/negative prompt to each provider's actual prompt syntax. Flux has no
 * native negative-prompt concept, SDXL UIs conventionally show it as a separate labelled field,
 * Midjourney takes it as a `--no` parameter, and Gemini/Imagen work best as one natural-language
 * sentence rather than a keyword list.
 */
export function formatPromptForProvider(recipe: PromptRecipe, provider: PromptProvider): string {
  const prompt = recipe.aiPrompt.trim()
  const negative = recipe.negativePrompt.trim()

  switch (provider) {
    case 'flux':
      return prompt
    case 'sdxl':
      return negative ? `${prompt}\nNegative prompt: ${negative}` : prompt
    case 'midjourney':
      return negative ? `${prompt} --no ${negative}` : prompt
    case 'gemini':
      return negative ? `${prompt} Avoid: ${negative}.` : prompt
  }
}

/**
 * A starting-point draft for the AI prompt field, built purely from the user's own
 * subject/composition/lighting/mood/style text and the names of enabled effects — never
 * invented content, and no AI/network call involved. The user is expected to edit it.
 */
export function suggestPromptDraft(recipe: PromptRecipe, effects: EffectNode[]): string {
  const effectNames = effects
    .filter((effect) => effect.enabled)
    .map((effect) => effect.name.toLowerCase())
  const parts = [
    recipe.subject.trim(),
    recipe.composition.trim() && `${recipe.composition.trim()} composition`,
    recipe.lighting.trim() && `${recipe.lighting.trim()} lighting`,
    recipe.mood.trim() && `${recipe.mood.trim()} mood`,
    recipe.styleNotes.trim(),
    effectNames.length > 0 && `${effectNames.join(', ')} style treatment`,
  ].filter((part): part is string => Boolean(part))

  return parts.join(', ')
}
