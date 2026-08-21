import { beforeEach, describe, expect, it } from 'vitest'
import type { ShowcaseProject, ShowcaseState } from '@/types'
import { useShowcaseStore } from './showcaseStore'

function fakeState(overrides: Partial<ShowcaseState> = {}): ShowcaseState {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'State',
    effectNodes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function fakeShowcase(overrides: Partial<ShowcaseProject> = {}): ShowcaseProject {
  const now = new Date().toISOString()
  return {
    id: 'showcase-1',
    projectId: 'project-1',
    title: 'Test showcase',
    states: [],
    startStateId: '',
    endStateId: '',
    scrollMode: 'vertical-story',
    texts: {},
    displaySettings: { showMetadata: false, showRecipe: false, showParams: true },
    exportSettings: {
      format: 'png',
      quality: 0.92,
      resolution: 'original',
      metadataPolicy: 'strip-all',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  useShowcaseStore.setState({ showcase: fakeShowcase(), isSaving: false, saveError: null })
})

describe('showcaseStore state mutations', () => {
  it('updates name/description/notes on a specific state without touching others', () => {
    const a = fakeState({ id: 'a', name: 'A' })
    const b = fakeState({ id: 'b', name: 'B' })
    useShowcaseStore.setState({ showcase: fakeShowcase({ states: [a, b] }) })

    useShowcaseStore.getState().updateStateMeta('a', { name: 'A renamed', description: 'desc' })

    const states = useShowcaseStore.getState().showcase!.states
    expect(states[0].name).toBe('A renamed')
    expect(states[0].description).toBe('desc')
    expect(states[1].name).toBe('B')
  })

  it('duplicates a state right after the original with a new id, independent of the original', () => {
    const original = fakeState({ id: 'a', name: 'Original', effectNodes: [] })
    useShowcaseStore.setState({ showcase: fakeShowcase({ states: [original] }) })

    useShowcaseStore.getState().duplicateState('a')
    const states = useShowcaseStore.getState().showcase!.states
    expect(states).toHaveLength(2)
    expect(states[1].id).not.toBe('a')
    expect(states[1].name).toBe('Original (kopi)')

    // Editing the duplicate must not affect the original.
    useShowcaseStore.getState().updateStateMeta(states[1].id, { name: 'Changed' })
    expect(useShowcaseStore.getState().showcase!.states[0].name).toBe('Original')
  })

  it('reorders states', () => {
    const a = fakeState({ id: 'a' })
    const b = fakeState({ id: 'b' })
    useShowcaseStore.setState({ showcase: fakeShowcase({ states: [a, b] }) })

    useShowcaseStore.getState().reorderStates('a', 'b')
    const states = useShowcaseStore.getState().showcase!.states
    expect(states.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('removes a state and clears start/end references pointing at it', () => {
    const a = fakeState({ id: 'a' })
    const b = fakeState({ id: 'b' })
    useShowcaseStore.setState({
      showcase: fakeShowcase({ states: [a, b], startStateId: 'a', endStateId: 'a' }),
    })

    useShowcaseStore.getState().removeState('a')
    const showcase = useShowcaseStore.getState().showcase!
    expect(showcase.states).toHaveLength(1)
    expect(showcase.startStateId).toBe('b')
    expect(showcase.endStateId).toBe('b')
  })

  it('leaves start/end untouched when removing an unrelated state', () => {
    const a = fakeState({ id: 'a' })
    const b = fakeState({ id: 'b' })
    useShowcaseStore.setState({
      showcase: fakeShowcase({ states: [a, b], startStateId: 'a', endStateId: 'a' }),
    })

    useShowcaseStore.getState().removeState('b')
    const showcase = useShowcaseStore.getState().showcase!
    expect(showcase.startStateId).toBe('a')
    expect(showcase.endStateId).toBe('a')
  })

  it('sets start and end state independently', () => {
    const a = fakeState({ id: 'a' })
    const b = fakeState({ id: 'b' })
    useShowcaseStore.setState({ showcase: fakeShowcase({ states: [a, b] }) })

    useShowcaseStore.getState().setStartState('a')
    useShowcaseStore.getState().setEndState('b')
    const showcase = useShowcaseStore.getState().showcase!
    expect(showcase.startStateId).toBe('a')
    expect(showcase.endStateId).toBe('b')
  })

  it('updates scroll mode, title, texts, and display settings', () => {
    useShowcaseStore.getState().setScrollMode('before-after')
    useShowcaseStore.getState().updateTitle('New title')
    useShowcaseStore.getState().updateTexts({ intro: 'Welcome' })
    useShowcaseStore.getState().updateDisplaySettings({ showMetadata: true })

    const showcase = useShowcaseStore.getState().showcase!
    expect(showcase.scrollMode).toBe('before-after')
    expect(showcase.title).toBe('New title')
    expect(showcase.texts.intro).toBe('Welcome')
    expect(showcase.displaySettings.showMetadata).toBe(true)
    expect(showcase.displaySettings.showParams).toBe(true) // untouched fields survive the patch
  })

  it('no-ops every mutation when there is no showcase loaded', () => {
    useShowcaseStore.setState({ showcase: null })
    useShowcaseStore.getState().updateStateMeta('a', { name: 'x' })
    useShowcaseStore.getState().duplicateState('a')
    useShowcaseStore.getState().removeState('a')
    useShowcaseStore.getState().reorderStates('a', 'b')
    useShowcaseStore.getState().setStartState('a')
    useShowcaseStore.getState().updateTitle('x')
    expect(useShowcaseStore.getState().showcase).toBeNull()
  })
})
