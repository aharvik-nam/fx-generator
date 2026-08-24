import { describe, expect, it } from 'vitest'
import type { EffectNode, ImageProject } from '@/types'
import { listEffectDefinitions } from '@/engine/effects/registry'
import { EFFECT_CODE_SPECS } from './effectImplementations'
import { generateFullPipelineScript, generateRecipeMarkdown } from './recipeGenerator'

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
      hasSensitiveData: false,
    },
    effects: [],
    camera: { zoom: 1, panX: 0, panY: 0 },
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

describe('generateFullPipelineScript', () => {
  it('includes each enabled effect implementation function by name', () => {
    const script = generateFullPipelineScript([
      fakeEffect({ type: 'duotone' }),
      fakeEffect({ id: 'e2', type: 'film-grain', params: { amount: 0.2, size: 1 }, seed: 42 }),
    ])
    expect(script).toContain('const applyDuotone =')
    expect(script).toContain('const applyFilmGrain =')
    expect(script).toContain('function applyEffectChain(sourceCanvas)')
  })

  it('deduplicates a shared dependency used by multiple effects', () => {
    const script = generateFullPipelineScript([
      fakeEffect({ type: 'exposure', params: { stops: 1 } }),
      fakeEffect({ id: 'e2', type: 'contrast', params: { amount: 10 } }),
    ])
    // Both exposure and contrast depend on clamp8 - it must appear exactly once.
    const matches = script.match(/const clamp8 =/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('bakes the effect current params, opacity, and seed into the steps array', () => {
    const script = generateFullPipelineScript([
      fakeEffect({
        type: 'film-grain',
        opacity: 0.5,
        params: { amount: 0.3, size: 2 },
        seed: 12345,
      }),
    ])
    expect(script).toContain('{"amount":0.3,"size":2}')
    expect(script).toContain('12345')
    expect(script).toContain('opacity: 0.5')
  })

  it('maps blend mode "normal" to "source-over" and passes other modes through unchanged', () => {
    const normalScript = generateFullPipelineScript([fakeEffect({ blendMode: 'normal' })])
    expect(normalScript).toContain('blendMode: "source-over"')

    const multiplyScript = generateFullPipelineScript([fakeEffect({ blendMode: 'multiply' })])
    expect(multiplyScript).toContain('blendMode: "multiply"')
  })

  it('includes the mask helper only when at least one effect has a mask', () => {
    const withoutMask = generateFullPipelineScript([fakeEffect()])
    expect(withoutMask).not.toContain('function maskValueAt')

    const withMask = generateFullPipelineScript([
      fakeEffect({
        mask: { kind: 'radial-gradient', centerX: 0.5, centerY: 0.5, radius: 0.5, feather: 0.2 },
      }),
    ])
    expect(withMask).toContain('const maskValueAt =')
    expect(withMask).toContain('"kind":"radial-gradient"')
  })

  it('serializes each effect params and seed independently for multiple steps', () => {
    const script = generateFullPipelineScript([
      fakeEffect({ type: 'exposure', params: { stops: 1 } }),
      fakeEffect({ id: 'e2', type: 'exposure', params: { stops: -2 } }),
    ])
    expect(script).toContain('{"stops":1}')
    expect(script).toContain('{"stops":-2}')
    // The shared applyExposure implementation must still only be included once.
    expect(script.match(/const applyExposure =/g) ?? []).toHaveLength(1)
  })
})

describe('generateRecipeMarkdown', () => {
  it('reports no code to generate when the chain is empty', () => {
    const markdown = generateRecipeMarkdown(fakeProject())
    expect(markdown).toContain('Ingen aktive effekter')
  })

  it('lists the effect chain overview with opacity and, when set, blend mode and seed', () => {
    const effects: EffectNode[] = [
      fakeEffect(),
      fakeEffect({
        id: 'e2',
        type: 'film-grain',
        name: 'Film grain',
        opacity: 1,
        params: { amount: 0.18, size: 1 },
        seed: 829103,
        blendMode: 'screen',
      }),
    ]
    const markdown = generateRecipeMarkdown(fakeProject({ effects }))
    expect(markdown).toContain('1. Duotone — opacity 75%')
    expect(markdown).toContain('2. Film grain — opacity 100%, blend mode: screen, seed: 829103')
  })

  it('skips disabled effects entirely', () => {
    const effects = [fakeEffect({ enabled: false })]
    const markdown = generateRecipeMarkdown(fakeProject({ effects }))
    expect(markdown).toContain('Ingen aktive effekter')
    expect(markdown).not.toContain('Duotone')
  })

  it('includes a numbered section with description and code for each enabled effect', () => {
    const markdown = generateRecipeMarkdown(fakeProject({ effects: [fakeEffect()] }))
    expect(markdown).toContain('## 1. Duotone')
    expect(markdown).toContain('const applyDuotone =')
    expect(markdown).toContain('applyDuotone(imageData.data, width, height,')
  })

  it('includes the full assembled pipeline script and a usage example', () => {
    const markdown = generateRecipeMarkdown(fakeProject({ effects: [fakeEffect()] }))
    expect(markdown).toContain('## Hele effektkjeden samlet')
    expect(markdown).toContain('function applyEffectChain(sourceCanvas)')
    expect(markdown).toContain('img.onload')
  })
})

// A helper (like hexToRgb or sobelGradientAt) can silently read a private module-level constant
// that never got added to its EFFECT_CODE_SPECS entry — `.toString()` still "succeeds" and the
// generated text looks fine, but the constant is an undefined free variable at runtime. That
// exact bug (missing DEFAULT_RGB/SOBEL_X/SOBEL_Y/KMEANS_ITERATIONS/FLAT_MAGNITUDE_THRESHOLD/
// ATTEMPTS_PER_PARTICLE) was found by hand-testing the generated code in a real browser against
// both the dev server and a production build — production minification was the more important
// half of that: it renames free variables, so a *hardcoded* dependency name (the old `konst()`
// mechanism) could never track the mangled name the minified caller actually references. The
// fix was structural, not a patch: every such constant now lives inside the one function that
// uses it (see effectImplementations.ts's top comment), and CodeDependency no longer has a
// const-shaped variant at all — only function dependencies remain, because a function's `.name`
// is read live and therefore always matches whatever a build renamed it to. An automated
// in-process execution check was attempted here too, but both `new Function` and a real temp-file
// `import()` run into vitest/vite-node's own module-loading layer rewriting or intercepting the
// generated code in ways a real browser never would — so verification for this class of bug is
// manual: reproduce in the dev server AND a `vite preview` production build, not just unit tests.
describe('generated code has a spec for every effect', () => {
  it('has an EFFECT_CODE_SPECS entry for every registered effect', () => {
    for (const definition of listEffectDefinitions()) {
      expect(EFFECT_CODE_SPECS[definition.id], `missing spec for "${definition.id}"`).toBeDefined()
    }
  })
})
