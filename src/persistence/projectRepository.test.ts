// @vitest-environment node
//
// IndexedDB has nothing to do with the DOM, and fake-indexeddb's structured-clone of Blob
// values is only reliable under Node's native Blob — under jsdom it silently degrades to a
// plain object with no size/type/text(). Real browsers don't have this problem (native
// IndexedDB clones real Blobs correctly); this is purely a test-environment quirk.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ImageProject } from '@/types'
import { deleteProject, listProjects, loadProjectOriginal, saveProject } from './projectRepository'

function fakeProject(overrides: Partial<ImageProject> = {}): ImageProject {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'test.png',
    createdAt: now,
    updatedAt: now,
    originalImageId: crypto.randomUUID(),
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
    recipe: {
      subject: '',
      composition: '',
      lighting: '',
      mood: '',
      styleNotes: '',
      aiPrompt: '',
      negativePrompt: '',
      reproductionNotes: '',
    },
    exportSettings: {
      format: 'png',
      quality: 0.92,
      resolution: 'original',
      metadataPolicy: 'strip-all',
    },
    ...overrides,
  }
}

beforeEach(async () => {
  for (const project of await listProjects()) {
    await deleteProject(project)
  }
})

describe('projectRepository', () => {
  it('saves and lists a project', async () => {
    const project = fakeProject({ name: 'sunset.jpg' })
    await saveProject(project, new Blob(['fake image bytes']))

    const projects = await listProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('sunset.jpg')
  })

  it('stores and retrieves the original image blob separately, keyed by originalImageId', async () => {
    const project = fakeProject()
    const blob = new Blob(['original bytes'], { type: 'image/png' })
    await saveProject(project, blob)

    const stored = await loadProjectOriginal(project.originalImageId)
    expect(stored).toBeDefined()
    expect(await stored?.text()).toBe('original bytes')
  })

  it('lists projects most-recently-updated first', async () => {
    const older = fakeProject({ name: 'older', updatedAt: '2024-01-01T00:00:00.000Z' })
    const newer = fakeProject({ name: 'newer', updatedAt: '2024-06-01T00:00:00.000Z' })
    await saveProject(older, new Blob())
    await saveProject(newer, new Blob())

    const projects = await listProjects()
    expect(projects.map((p) => p.name)).toEqual(['newer', 'older'])
  })

  it('overwrites an existing project when saved again with the same id', async () => {
    const project = fakeProject({ name: 'v1' })
    await saveProject(project, new Blob())
    await saveProject({ ...project, name: 'v2' }, new Blob())

    const projects = await listProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('v2')
  })

  it('deletes both the project and its original blob', async () => {
    const project = fakeProject()
    await saveProject(project, new Blob(['bytes']))
    await deleteProject(project)

    expect(await listProjects()).toHaveLength(0)
    expect(await loadProjectOriginal(project.originalImageId)).toBeUndefined()
  })
})
