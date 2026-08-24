import { beforeEach, describe, expect, it } from 'vitest'
import type { ImageProject } from '@/types'
import { useProjectStore } from './projectStore'

function fakeProject(): ImageProject {
  const now = new Date().toISOString()
  return {
    id: 'project-1',
    name: 'test.png',
    createdAt: now,
    updatedAt: now,
    originalImageId: 'asset-1',
    originalMetadata: {
      fileName: 'test.png',
      fileSize: 1024,
      mimeType: 'image/png',
      dimensions: { width: 100, height: 100 },
      orientation: 'square',
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
  }
}

beforeEach(() => {
  useProjectStore.setState({
    project: fakeProject(),
    assets: { originalFile: null, originalBitmap: null, previewBitmap: null },
    history: { past: [], future: [] },
    selectedEffectId: null,
    showBeforeAfter: false,
    isLoading: false,
    loadError: null,
  })
})

describe('projectStore effect chain mutations', () => {
  it('adds an effect and selects it', () => {
    useProjectStore.getState().addEffect('exposure')
    const { project, selectedEffectId } = useProjectStore.getState()
    expect(project?.effects).toHaveLength(1)
    expect(project?.effects[0].type).toBe('exposure')
    expect(selectedEffectId).toBe(project?.effects[0].id)
  })

  it('removes an effect by id', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project?.effects[0].id
    useProjectStore.getState().removeEffect(id!)
    expect(useProjectStore.getState().project?.effects).toHaveLength(0)
  })

  it('duplicates an effect right after the original with a new id', () => {
    useProjectStore.getState().addEffect('contrast')
    const original = useProjectStore.getState().project!.effects[0]
    useProjectStore.getState().duplicateEffect(original.id)
    const effects = useProjectStore.getState().project!.effects
    expect(effects).toHaveLength(2)
    expect(effects[1].id).not.toBe(original.id)
    expect(effects[1].type).toBe('contrast')
    expect(effects[1].params).toEqual(original.params)
  })

  it('reorders effects', () => {
    useProjectStore.getState().addEffect('exposure')
    useProjectStore.getState().addEffect('contrast')
    const [first, second] = useProjectStore.getState().project!.effects
    useProjectStore.getState().reorderEffects(first.id, second.id)
    const effects = useProjectStore.getState().project!.effects
    expect(effects[0].id).toBe(second.id)
    expect(effects[1].id).toBe(first.id)
  })

  it('toggles enabled state', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore.getState().toggleEffectEnabled(id)
    expect(useProjectStore.getState().project!.effects[0].enabled).toBe(false)
    useProjectStore.getState().toggleEffectEnabled(id)
    expect(useProjectStore.getState().project!.effects[0].enabled).toBe(true)
  })

  it('updates a param value', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore.getState().updateEffectParam(id, 'stops', 1.5)
    expect(useProjectStore.getState().project!.effects[0].params.stops).toBe(1.5)
  })

  it('resets params back to the effect defaults', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore.getState().updateEffectParam(id, 'stops', 2)
    useProjectStore.getState().resetEffectParams(id)
    expect(useProjectStore.getState().project!.effects[0].params.stops).toBe(0)
  })

  it('adds an effect with an initial params override (applying a preset)', () => {
    useProjectStore.getState().addEffect('exposure', { stops: 2.5 })
    expect(useProjectStore.getState().project!.effects[0].params).toEqual({ stops: 2.5 })
  })

  it('applies a full params object to an existing effect (applying a preset)', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore.getState().applyEffectParams(id, { stops: -1 })
    expect(useProjectStore.getState().project!.effects[0].params).toEqual({ stops: -1 })
  })

  it('appends fresh copies of a chain preset onto the existing stack and selects the last one', () => {
    useProjectStore.getState().addEffect('exposure')
    const chain = useProjectStore.getState().project!.effects
    useProjectStore.getState().addEffectsFromChainPreset(chain)
    const { project, selectedEffectId } = useProjectStore.getState()
    expect(project?.effects).toHaveLength(2)
    expect(project?.effects[1].type).toBe('exposure')
    expect(project?.effects[1].id).not.toBe(project?.effects[0].id)
    expect(selectedEffectId).toBe(project?.effects[1].id)
  })

  it('does nothing when applying an empty chain preset', () => {
    useProjectStore.getState().addEffectsFromChainPreset([])
    expect(useProjectStore.getState().project?.effects).toHaveLength(0)
  })

  it('sets a mask on an effect', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore
      .getState()
      .setEffectMask(id, { kind: 'linear-gradient', angle: 45, feather: 0.5 })
    expect(useProjectStore.getState().project!.effects[0].mask).toEqual({
      kind: 'linear-gradient',
      angle: 45,
      feather: 0.5,
    })
  })

  it('does not push history when setEffectMask is called with commit: false', () => {
    useProjectStore.getState().addEffect('exposure')
    const before = useProjectStore.getState().history.past.length
    const id = useProjectStore.getState().project!.effects[0].id
    useProjectStore
      .getState()
      .setEffectMask(id, { kind: 'linear-gradient', angle: 10, feather: 0.5 }, { commit: false })
    expect(useProjectStore.getState().history.past.length).toBe(before)
  })
})

describe('projectStore undo/redo', () => {
  it('undoes the last committed change', () => {
    useProjectStore.getState().addEffect('exposure')
    expect(useProjectStore.getState().project!.effects).toHaveLength(1)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project!.effects).toHaveLength(0)
  })

  it('redoes an undone change', () => {
    useProjectStore.getState().addEffect('exposure')
    useProjectStore.getState().undo()
    useProjectStore.getState().redo()
    expect(useProjectStore.getState().project!.effects).toHaveLength(1)
  })

  it('clears the redo stack on a new edit after undo', () => {
    useProjectStore.getState().addEffect('exposure')
    useProjectStore.getState().undo()
    useProjectStore.getState().addEffect('contrast')
    expect(useProjectStore.getState().history.future).toHaveLength(0)
  })

  it('does not push history for live (uncommitted) param updates, but does on commit', () => {
    useProjectStore.getState().addEffect('exposure')
    const id = useProjectStore.getState().project!.effects[0].id
    const pastLengthBefore = useProjectStore.getState().history.past.length

    useProjectStore.getState().updateEffectParam(id, 'stops', 0.5, { commit: false })
    useProjectStore.getState().updateEffectParam(id, 'stops', 1, { commit: false })
    expect(useProjectStore.getState().history.past).toHaveLength(pastLengthBefore)

    useProjectStore.getState().updateEffectParam(id, 'stops', 1.2, { commit: true })
    expect(useProjectStore.getState().history.past).toHaveLength(pastLengthBefore + 1)
    expect(useProjectStore.getState().project!.effects[0].params.stops).toBe(1.2)
  })

  it('no-ops undo/redo when there is nothing to undo/redo', () => {
    const before = useProjectStore.getState().project
    useProjectStore.getState().undo()
    useProjectStore.getState().redo()
    expect(useProjectStore.getState().project).toBe(before)
  })
})
