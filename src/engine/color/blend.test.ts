import { describe, expect, it } from 'vitest'
import { BLEND_MODE_OPTIONS, blendModeToCompositeOperation } from './blend'
import type { BlendMode } from '@/types'

describe('blendModeToCompositeOperation', () => {
  it('maps normal to source-over', () => {
    expect(blendModeToCompositeOperation('normal')).toBe('source-over')
  })

  it('maps every other blend mode to the identically-named composite operation', () => {
    const modes: BlendMode[] = ['multiply', 'screen', 'overlay', 'color-dodge', 'luminosity']
    for (const mode of modes) {
      expect(blendModeToCompositeOperation(mode)).toBe(mode)
    }
  })

  it('exposes exactly 16 blend mode options', () => {
    expect(BLEND_MODE_OPTIONS).toHaveLength(16)
  })
})
