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
