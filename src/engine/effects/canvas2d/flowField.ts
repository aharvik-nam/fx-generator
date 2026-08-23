/**
 * A cheap position-based "flow field" — three sine waves at different frequencies/phases,
 * summed and scaled to an angle. Produces a *smoothly* varying direction across the canvas
 * (unlike calling `random()` per point, which reads as scribbly noise), the way wind or water
 * currents change direction gradually rather than jumping around. `seed` shifts the phase so
 * different seeds still produce different-looking flows. Shared by Painterly (stroke direction
 * in flat areas with no reliable gradient) and Flow field (the whole effect).
 */
export function flowAngleAt(x: number, y: number, seed: number): number {
  const phase = (seed % 1000) * 0.01
  const wave =
    Math.sin(x * 0.02 + phase) +
    Math.sin(y * 0.017 + phase * 1.7) +
    Math.sin((x + y) * 0.011 - phase * 0.6)
  return (wave * Math.PI) / 2
}
