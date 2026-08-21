/**
 * The human-authored + auto-filled fields behind the AI Image Recipe markdown export.
 * Subject/composition/lighting/mood/styleNotes are user-typed; the generator fills in
 * the technical sections (source, effect pipeline) from the project itself.
 */
export type PromptRecipe = {
  subject: string
  composition: string
  lighting: string
  mood: string
  styleNotes: string
  aiPrompt: string
  negativePrompt: string
  reproductionNotes: string
  /** When set, overrides the generated markdown entirely (user has hand-edited it). */
  customMarkdown?: string
}

export type PromptProvider = 'flux' | 'sdxl' | 'midjourney' | 'gemini'
