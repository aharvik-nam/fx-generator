// @vitest-environment node
//
// Same rationale as projectRepository.test.ts: fake-indexeddb's structured-clone only
// reliably clones plain data under Node, and a ShowcaseProject is plain JSON-serializable
// data (no Blob involved here), so this also sidesteps the jsdom Blob-cloning quirk entirely.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ShowcaseProject } from '@/types'
import { deleteShowcase, loadShowcaseByProjectId, saveShowcase } from './showcaseRepository'
import { loadProjectOriginal } from './projectRepository'

function fakeShowcase(overrides: Partial<ShowcaseProject> = {}): ShowcaseProject {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    projectId: 'project-1',
    title: 'My showcase',
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

beforeEach(async () => {
  const existing = await loadShowcaseByProjectId('project-1')
  if (existing) await deleteShowcase(existing.id)
})

describe('showcaseRepository', () => {
  it('saves and loads a showcase by its source projectId', async () => {
    const showcase = fakeShowcase({ title: 'Sunset transformation' })
    await saveShowcase(showcase)

    const loaded = await loadShowcaseByProjectId('project-1')
    expect(loaded?.title).toBe('Sunset transformation')
  })

  it('returns undefined when no showcase exists for a projectId', async () => {
    expect(await loadShowcaseByProjectId('does-not-exist')).toBeUndefined()
  })

  it('overwrites an existing showcase when saved again with the same id', async () => {
    const showcase = fakeShowcase({ title: 'v1' })
    await saveShowcase(showcase)
    await saveShowcase({ ...showcase, title: 'v2' })

    const loaded = await loadShowcaseByProjectId('project-1')
    expect(loaded?.title).toBe('v2')
  })

  it('deletes a showcase', async () => {
    const showcase = fakeShowcase()
    await saveShowcase(showcase)
    await deleteShowcase(showcase.id)

    expect(await loadShowcaseByProjectId('project-1')).toBeUndefined()
  })

  it('does not interfere with the projects/originals stores', async () => {
    await saveShowcase(fakeShowcase())
    // A sibling repository hitting a different object store should work unaffected.
    expect(await loadProjectOriginal('no-such-original')).toBeUndefined()
  })
})
