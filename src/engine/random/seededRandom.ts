/**
 * mulberry32 — small, fast, deterministic PRNG. Given the same seed it always produces the
 * same sequence, which is what lets generative effects (film grain, etc.) reproduce exactly
 * from a stored EffectNode.seed.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Combines a base seed with a 2D grid index into a new, independent seed — for effects that
 * jitter points on a grid (flow field, painterly, stippling) whose exact row/column *count*
 * changes slightly between the app's downscaled preview and a full-resolution export (rounding
 * on a resolution-scaled cell spacing). Feeding one shared `mulberry32(seed)` sequentially
 * through such a grid means any change in cell count shifts every later cell's random draws —
 * so preview and export, despite using the same seed, produce visibly different point
 * placements. Keying each cell's own `mulberry32` instance off its own (row, col) instead makes
 * a cell's jitter depend only on its own grid position, never on how many other cells exist.
 */
export function cellSeed(seed: number, row: number, col: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ row, 0x85ebca6b)
  h = Math.imul(h ^ col, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
