import { getEffectDefinition } from '@/engine/effects/registry'
import { hexToRgb, rgbToHex } from '@/engine/effects/canvas2d/colorMath'
import type { CameraState, EffectNode, EffectParams, RenderState, ShowcaseState } from '@/types'

const DEFAULT_CAMERA: CameraState = { zoom: 1, panX: 0, panY: 0 }

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColorHex(a: string, b: string, t: number): string {
  const from = hexToRgb(a)
  const to = hexToRgb(b)
  return rgbToHex({
    r: lerp(from.r, to.r, t),
    g: lerp(from.g, to.g, t),
    b: lerp(from.b, to.b, t),
  })
}

/**
 * Params are interpolated per-key using the effect's own paramSchema: numeric kinds (slider,
 * number) lerp, color lerps in RGB space, and select/boolean snap at the midpoint since there's
 * no meaningful in-between value for those. Falls back to snapping any key the schema doesn't
 * describe, rather than dropping it.
 */
function interpolateParams(
  type: string,
  from: EffectParams,
  to: EffectParams,
  t: number,
): EffectParams {
  const schema = getEffectDefinition(type).paramSchema
  const result: EffectParams = {}
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const fromValue = from[key]
    const toValue = to[key]
    if (fromValue === undefined) {
      result[key] = toValue
      continue
    }
    if (toValue === undefined) {
      result[key] = fromValue
      continue
    }
    const kind = schema[key]?.kind
    if (
      (kind === 'slider' || kind === 'number') &&
      typeof fromValue === 'number' &&
      typeof toValue === 'number'
    ) {
      result[key] = lerp(fromValue, toValue, t)
    } else if (kind === 'color' && typeof fromValue === 'string' && typeof toValue === 'string') {
      result[key] = lerpColorHex(fromValue, toValue, t)
    } else {
      result[key] = t < 0.5 ? fromValue : toValue
    }
  }
  return result
}

/** Interpolates one effect node present in both states. `a`/`b` share `id` (see matching rules). */
function interpolateNode(a: EffectNode, b: EffectNode, t: number): EffectNode {
  if (a.type !== b.type) {
    // Same id, different effect type — nothing meaningful to blend, snap the whole node.
    return t < 0.5 ? a : b
  }
  return {
    ...b,
    enabled: t < 0.5 ? a.enabled : b.enabled,
    opacity: lerp(a.opacity, b.opacity, t),
    blendMode: t < 0.5 ? a.blendMode : b.blendMode,
    seed: t < 0.5 ? a.seed : b.seed,
    params: interpolateParams(a.type, a.params, b.params, t),
  }
}

/**
 * Produces the renderable midpoint between two showcase states, for scroll-driven transitions
 * (pinned-canvas/scrollytelling — post-MVP). Effects are matched by stable `id`: a node present
 * in both states blends per-param (see interpolateParams); a node present in only one fades its
 * opacity in/out across `progress` instead of popping in/out abruptly. `before-after` compares
 * two fully rendered states directly and has no need for this function.
 */
export function interpolateShowcaseState(
  from: ShowcaseState,
  to: ShowcaseState,
  progress: number,
): RenderState {
  const t = Math.min(1, Math.max(0, progress))

  const fromById = new Map(from.effectNodes.map((node) => [node.id, node]))
  const toById = new Map(to.effectNodes.map((node) => [node.id, node]))

  const orderedIds: string[] = []
  for (const node of to.effectNodes) orderedIds.push(node.id)
  for (const node of from.effectNodes) if (!toById.has(node.id)) orderedIds.push(node.id)

  const effects: EffectNode[] = orderedIds.map((id) => {
    const a = fromById.get(id)
    const b = toById.get(id)
    if (a && b) return interpolateNode(a, b, t)
    if (a) return { ...a, opacity: a.opacity * (1 - t) }
    if (b) return { ...b, opacity: b.opacity * t }
    // Unreachable: orderedIds is the union of fromById/toById keys, so at least one is defined.
    throw new Error(`interpolateShowcaseState: effect id "${id}" missing from both states`)
  })

  const fromCamera = from.camera ?? DEFAULT_CAMERA
  const toCamera = to.camera ?? DEFAULT_CAMERA

  return {
    effects,
    camera: {
      zoom: lerp(fromCamera.zoom, toCamera.zoom, t),
      panX: lerp(fromCamera.panX, toCamera.panX, t),
      panY: lerp(fromCamera.panY, toCamera.panY, t),
    },
    quality: 'preview',
  }
}
