import { describe, expect, it } from 'vitest'
import type { EffectNode, ImageProject, PromptRecipe } from '@/types'
import {
  formatPromptForProvider,
  generateRecipeMarkdown,
  suggestPromptDraft,
} from './recipeGenerator'

function fakeProject(overrides: Partial<ImageProject> = {}): ImageProject {
  const now = '2024-06-15T10:00:00.000Z'
  return {
    id: 'p1',
    name: 'sunset.jpg',
    createdAt: now,
    updatedAt: now,
    originalImageId: 'asset-1',
    originalMetadata: {
      fileName: 'sunset.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      dimensions: { width: 6000, height: 4000 },
      orientation: 'landscape',
      camera: { make: 'Sony', model: 'A7IV' },
      lens: { model: '24-70mm' },
      captureDate: '2024-06-01T08:00:00.000Z',
      hasSensitiveData: false,
    },
    effects: [],
    camera: { zoom: 1, panX: 0, panY: 0 },
    recipe: {
      subject: '',
      composition: '',
      lighting: '',
      mood: '',
      styleNotes: '',
      aiPrompt: '',
      negativePrompt: '',
      reproductionNotes: '',
    },
    exportSettings: {
      format: 'png',
      quality: 0.92,
      resolution: 'original',
      metadataPolicy: 'strip-all',
    },
    ...overrides,
  }
}

function fakeEffect(overrides: Partial<EffectNode> = {}): EffectNode {
  return {
    id: 'e1',
    type: 'duotone',
    name: 'Duotone',
    enabled: true,
    opacity: 0.75,
    blendMode: 'normal',
    params: { shadowColor: '#102030', highlightColor: '#f4d06f' },
    ...overrides,
  }
}

describe('generateRecipeMarkdown', () => {
  it('includes the source section built from original metadata', () => {
    const markdown = generateRecipeMarkdown(fakeProject(), [])
    expect(markdown).toContain('# Image Recipe')
    expect(markdown).toContain('- Original: `sunset.jpg`')
    expect(markdown).toContain('- Dimensions: 6000 × 4000 px')
    expect(markdown).toContain('- Orientation: landscape')
    expect(markdown).toContain('- Camera: Sony A7IV')
    expect(markdown).toContain('- Lens: 24-70mm')
    expect(markdown).toContain('- Date: 2024-06-01')
    expect(markdown).toContain('- Metadata policy: removed on export')
  })

  it('falls back to "not specified" placeholders for empty user fields', () => {
    const markdown = generateRecipeMarkdown(fakeProject(), [])
    expect(markdown).toContain('- Subject: _not specified_')
    expect(markdown).toContain('## AI prompt\n_not specified_')
  })

  it('includes user-authored visual description fields when present', () => {
    const recipe: PromptRecipe = {
      subject: 'A lone tree on a hill',
      composition: 'Rule of thirds',
      lighting: 'Golden hour backlight',
      mood: 'Melancholic',
      styleNotes: 'Cinematic, muted tones',
      aiPrompt: 'a lone tree on a hill at golden hour, cinematic',
      negativePrompt: 'blurry, low quality',
      reproductionNotes: 'Approximate only.',
    }
    const markdown = generateRecipeMarkdown(fakeProject({ recipe }), ['#102030', '#f4d06f'])
    expect(markdown).toContain('- Subject: A lone tree on a hill')
    expect(markdown).toContain('- Mood: Melancholic')
    expect(markdown).toContain('- Colour palette: #102030, #f4d06f')
    expect(markdown).toContain('## AI prompt\na lone tree on a hill at golden hour, cinematic')
    expect(markdown).toContain('## Negative prompt\nblurry, low quality')
  })

  it('lists effect pipeline entries with parameter labels, opacity, and seed', () => {
    const effects: EffectNode[] = [
      fakeEffect(),
      fakeEffect({
        id: 'e2',
        type: 'film-grain',
        name: 'Film grain',
        params: { amount: 0.18, size: 1 },
        seed: 829103,
      }),
    ]
    const markdown = generateRecipeMarkdown(fakeProject({ effects }), [])
    expect(markdown).toContain('1. Duotone')
    expect(markdown).toContain('- Shadow color: #102030')
    expect(markdown).toContain('- Opacity: 75%')
    expect(markdown).toContain('2. Film grain')
    expect(markdown).toContain('- Seed: 829103')
  })

  it('marks disabled effects explicitly', () => {
    const effects = [fakeEffect({ enabled: false })]
    const markdown = generateRecipeMarkdown(fakeProject({ effects }), [])
    expect(markdown).toContain('1. Duotone (disabled)')
  })

  it('reports "no effects" when the chain is empty', () => {
    const markdown = generateRecipeMarkdown(fakeProject(), [])
    expect(markdown).toContain('_No effects applied._')
  })
})

describe('formatPromptForProvider', () => {
  const recipe: PromptRecipe = {
    subject: '',
    composition: '',
    lighting: '',
    mood: '',
    styleNotes: '',
    aiPrompt: 'a foggy forest at dawn',
    negativePrompt: 'text, watermark',
    reproductionNotes: '',
  }

  it('returns the plain prompt for flux (no native negative-prompt support)', () => {
    expect(formatPromptForProvider(recipe, 'flux')).toBe('a foggy forest at dawn')
  })

  it('appends a labelled negative-prompt line for sdxl', () => {
    expect(formatPromptForProvider(recipe, 'sdxl')).toBe(
      'a foggy forest at dawn\nNegative prompt: text, watermark',
    )
  })

  it('appends a --no parameter for midjourney', () => {
    expect(formatPromptForProvider(recipe, 'midjourney')).toBe(
      'a foggy forest at dawn --no text, watermark',
    )
  })

  it('appends an "Avoid:" sentence for gemini', () => {
    expect(formatPromptForProvider(recipe, 'gemini')).toBe(
      'a foggy forest at dawn Avoid: text, watermark.',
    )
  })

  it('omits the negative-prompt suffix entirely when there is no negative prompt', () => {
    const noNegative: PromptRecipe = { ...recipe, negativePrompt: '' }
    expect(formatPromptForProvider(noNegative, 'sdxl')).toBe('a foggy forest at dawn')
    expect(formatPromptForProvider(noNegative, 'midjourney')).toBe('a foggy forest at dawn')
    expect(formatPromptForProvider(noNegative, 'gemini')).toBe('a foggy forest at dawn')
  })
})

describe('suggestPromptDraft', () => {
  const emptyRecipe: PromptRecipe = {
    subject: '',
    composition: '',
    lighting: '',
    mood: '',
    styleNotes: '',
    aiPrompt: '',
    negativePrompt: '',
    reproductionNotes: '',
  }

  it('joins only the non-empty user fields, comma-separated', () => {
    const recipe: PromptRecipe = { ...emptyRecipe, subject: 'a red fox', mood: 'serene' }
    expect(suggestPromptDraft(recipe, [])).toBe('a red fox, serene mood')
  })

  it('appends enabled effect names as a style treatment, skipping disabled ones', () => {
    const effects: EffectNode[] = [
      fakeEffect({ name: 'Duotone', enabled: true }),
      fakeEffect({ id: 'e2', name: 'Vignette', enabled: false }),
    ]
    const recipe: PromptRecipe = { ...emptyRecipe, subject: 'a mountain' }
    expect(suggestPromptDraft(recipe, effects)).toBe('a mountain, duotone style treatment')
  })

  it('returns an empty string when nothing is filled in and no effects are applied', () => {
    expect(suggestPromptDraft(emptyRecipe, [])).toBe('')
  })
})
