import { getEffectDefinition } from '@/engine/effects/registry'
import type { EffectNode, ImageProject } from '@/types'
import {
  EFFECT_CODE_SPECS,
  MASK_DEPS,
  type CodeDependency,
  type EffectCodeSpec,
} from './effectImplementations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => unknown

function functionBlock(f: AnyFn): string {
  return `const ${f.name} = ${f.toString()};`
}

function depBlock(dep: CodeDependency): string {
  return functionBlock(dep.fn)
}

function depKey(dep: CodeDependency): string {
  return dep.fn.name
}

/** A single effect's self-contained code block: every helper it depends on, deduplicated, plus
 * the effect's own implementation — pulled live via `.toString()` from the exact function the
 * app runs, never a hand-written re-description of the algorithm. */
function generateEffectCode(spec: EffectCodeSpec): string {
  const seen = new Set<string>()
  const blocks: string[] = []
  for (const dep of spec.deps) {
    const key = depKey(dep)
    if (seen.has(key)) continue
    seen.add(key)
    blocks.push(depBlock(dep))
  }
  blocks.push(functionBlock(spec.mainFn))
  return blocks.join('\n\n')
}

function usageSnippet(effect: EffectNode, spec: EffectCodeSpec): string {
  const paramsJson = JSON.stringify(effect.params)
  const seed = effect.seed ?? 0
  const fnName = spec.mainFn.name
  if (spec.kind === 'pixel') {
    return [
      'const imageData = ctx.getImageData(0, 0, width, height)',
      `${fnName}(imageData.data, width, height, ${paramsJson}, ${seed})`,
      'ctx.putImageData(imageData, 0, 0)',
    ].join('\n')
  }
  return `${fnName}(ctx, width, height, ${paramsJson}, ${seed})`
}

function formatChainOverview(effects: EffectNode[]): string {
  return effects
    .map((effect, i) => {
      const details = [`opacity ${Math.round(effect.opacity * 100)}%`]
      if (effect.blendMode !== 'normal') details.push(`blend mode: ${effect.blendMode}`)
      if (effect.seed !== undefined) details.push(`seed: ${effect.seed}`)
      if (effect.mask && effect.mask.kind !== 'none') details.push(`maske: ${effect.mask.kind}`)
      return `${i + 1}. ${getEffectDefinition(effect.type).name} — ${details.join(', ')}`
    })
    .join('\n')
}

function formatEffectSection(effect: EffectNode, index: number): string {
  const definition = getEffectDefinition(effect.type)
  const spec = EFFECT_CODE_SPECS[effect.type]
  const lines = [
    `## ${index + 1}. ${definition.name}`,
    '',
    definition.description,
    '',
    '```js',
    generateEffectCode(spec),
    '```',
    '',
    '**Bruk alene** (på et 2D canvas-kontekst `ctx` med bildet allerede tegnet inn, `width`/`height` = canvasets mål):',
    '```js',
    usageSnippet(effect, spec),
    '```',
  ]
  return lines.join('\n')
}

/**
 * The full, deduplicated pipeline script: every helper and main function each enabled effect
 * needs (included once, even if several effects share one), plus an `applyEffectChain(sourceCanvas)`
 * orchestrator that composites them in order — cloning the running canvas per step, applying the
 * effect, optionally clipping its alpha by a mask, then compositing it back with the effect's own
 * opacity/blend mode via `globalAlpha`/`globalCompositeOperation`. This mirrors exactly what
 * `RenderPipeline.compute()` does internally (see engine/pipeline/renderPipeline.ts), just
 * expressed as plain, dependency-free JavaScript instead of OffscreenCanvas-based TypeScript.
 */
export function generateFullPipelineScript(effects: EffectNode[]): string {
  const seen = new Set<string>()
  const blocks: string[] = []

  function include(dep: CodeDependency): void {
    const key = depKey(dep)
    if (seen.has(key)) return
    seen.add(key)
    blocks.push(depBlock(dep))
  }

  function includeMainFn(mainFn: AnyFn): void {
    if (seen.has(mainFn.name)) return
    seen.add(mainFn.name)
    blocks.push(functionBlock(mainFn))
  }

  const needsMask = effects.some((effect) => effect.mask && effect.mask.kind !== 'none')
  if (needsMask) for (const dep of MASK_DEPS) include(dep)

  const stepLines = effects.map((effect) => {
    const spec = EFFECT_CODE_SPECS[effect.type]
    for (const dep of spec.deps) include(dep)
    includeMainFn(spec.mainFn)

    const paramsJson = JSON.stringify(effect.params)
    const seed = effect.seed ?? 0
    const runExpr =
      spec.kind === 'pixel'
        ? `(ctx, width, height) => { const imageData = ctx.getImageData(0, 0, width, height); ${spec.mainFn.name}(imageData.data, width, height, ${paramsJson}, ${seed}); ctx.putImageData(imageData, 0, 0) }`
        : `(ctx, width, height) => { ${spec.mainFn.name}(ctx, width, height, ${paramsJson}, ${seed}) }`
    // Canvas 2D's globalCompositeOperation values match every BlendMode name exactly except
    // 'normal' -> 'source-over' (see engine/color/blend.ts) — no mapping table needed here.
    const compositeOp = effect.blendMode === 'normal' ? 'source-over' : effect.blendMode
    const maskJson =
      effect.mask && effect.mask.kind !== 'none' ? JSON.stringify(effect.mask) : 'null'

    return `  { run: ${runExpr}, opacity: ${effect.opacity}, blendMode: ${JSON.stringify(compositeOp)}, mask: ${maskJson} },`
  })

  const orchestrator = `function applyEffectChain(sourceCanvas) {
  const width = sourceCanvas.width
  const height = sourceCanvas.height
  const steps = [
${stepLines.join('\n')}
  ]

  let base = document.createElement('canvas')
  base.width = width
  base.height = height
  base.getContext('2d').drawImage(sourceCanvas, 0, 0)

  for (const step of steps) {
    const layer = document.createElement('canvas')
    layer.width = width
    layer.height = height
    const layerCtx = layer.getContext('2d')
    layerCtx.drawImage(base, 0, 0)
    step.run(layerCtx, width, height)

    if (step.mask) {
      const baseCtx = base.getContext('2d')
      const layerData = layerCtx.getImageData(0, 0, width, height)
      const baseData =
        step.mask.kind === 'luminosity' ? baseCtx.getImageData(0, 0, width, height).data : null
      for (let y = 0; y < height; y++) {
        const ny = (y + 0.5) / height
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const nx = (x + 0.5) / width
          const baseColor = baseData
            ? { r: baseData[i], g: baseData[i + 1], b: baseData[i + 2] }
            : undefined
          const value = maskValueAt(nx, ny, step.mask, baseColor)
          layerData.data[i + 3] = Math.round(layerData.data[i + 3] * value)
        }
      }
      layerCtx.putImageData(layerData, 0, 0)
    }

    const next = document.createElement('canvas')
    next.width = width
    next.height = height
    const nextCtx = next.getContext('2d')
    nextCtx.drawImage(base, 0, 0)
    nextCtx.globalAlpha = step.opacity
    nextCtx.globalCompositeOperation = step.blendMode
    nextCtx.drawImage(layer, 0, 0)
    base = next
  }

  return base
}`

  return [...blocks, orchestrator].join('\n\n')
}

export const USAGE_EXAMPLE = `const img = new Image()
img.onload = () => {
  const source = document.createElement('canvas')
  source.width = img.width
  source.height = img.height
  source.getContext('2d').drawImage(img, 0, 0)

  const result = applyEffectChain(source)
  document.body.appendChild(result) // or draw \`result\` onto your own visible <canvas>
}
img.src = 'your-image.jpg'`

/**
 * Builds the Effect Recipe markdown: a per-effect breakdown (each with its own self-contained,
 * copy-pasteable code block) followed by the full deduplicated pipeline script. Every code block
 * is real, running JavaScript sourced live from the app's own implementation — there is nothing
 * here for the user to author, and nothing invented on their behalf.
 */
export function generateRecipeMarkdown(project: ImageProject): string {
  const enabled = project.effects.filter((effect) => effect.enabled)
  const lines = [
    '# Effect Recipe',
    '',
    'Ekte, kjørbar JavaScript (Canvas 2D) som gjenskaper effektkjeden under — nøyaktig de samme ' +
      'algoritmene og parameterverdiene appen selv bruker akkurat nå. Ingen KI involvert; dette er ' +
      'kildekode, ikke en generert prompt.',
  ]

  if (enabled.length === 0) {
    lines.push('', '_Ingen aktive effekter — legg til en effekt for å generere kode._')
    return lines.join('\n')
  }

  lines.push('', '## Effektkjede', formatChainOverview(enabled))

  enabled.forEach((effect, i) => {
    lines.push('', formatEffectSection(effect, i))
  })

  lines.push(
    '',
    '## Hele effektkjeden samlet',
    'Kjører alle effektene i rekkefølge med riktig opacity, blend mode og maske mellom hvert ' +
      'steg — akkurat slik appen selv setter dem sammen internt (se `RenderPipeline`).',
    '',
    '```js',
    generateFullPipelineScript(enabled),
    '```',
    '',
    '**Eksempel på bruk:**',
    '```js',
    USAGE_EXAMPLE,
    '```',
  )

  return lines.join('\n')
}
