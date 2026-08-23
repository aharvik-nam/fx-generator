import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'
import type {
  BlendMode,
  CameraState,
  EffectNode,
  EffectParams,
  ExportSettings,
  ImageProject,
  OriginalImageMetadata,
  PromptRecipe,
} from '@/types'
import { createEffectNode, defaultParamsFor } from '@/engine/effects/registry'
import { createPreviewBitmap, decodeImageFile } from '@/engine/image/imageLoading'
import { readImageMetadata } from '@/metadata/readMetadata'
import { validateImageFile } from '@/lib/fileValidation'
import { saveProject as persistProject, loadProjectOriginal } from '@/persistence/projectRepository'
import { useViewStore } from './viewStore'

const MAX_HISTORY_LENGTH = 50

type ProjectAssets = {
  originalFile: File | null
  originalBitmap: ImageBitmap | null
  previewBitmap: ImageBitmap | null
}

type HistoryState = {
  past: EffectNode[][]
  future: EffectNode[][]
}

type ProjectStore = {
  project: ImageProject | null
  assets: ProjectAssets
  history: HistoryState
  selectedEffectId: string | null
  showBeforeAfter: boolean
  isLoading: boolean
  loadError: string | null
  isSaving: boolean
  saveError: string | null

  loadImage: (file: File) => Promise<void>
  loadSavedProject: (project: ImageProject) => Promise<void>
  saveCurrentProject: () => Promise<void>
  clearLoadError: () => void

  addEffect: (type: string, paramsOverride?: EffectParams) => void
  removeEffect: (id: string) => void
  duplicateEffect: (id: string) => void
  reorderEffects: (activeId: string, overId: string) => void
  toggleEffectEnabled: (id: string) => void
  setEffectOpacity: (id: string, opacity: number, options?: { commit?: boolean }) => void
  setEffectBlendMode: (id: string, blendMode: BlendMode) => void
  updateEffectParam: (
    id: string,
    key: string,
    value: EffectParams[string],
    options?: { commit?: boolean },
  ) => void
  resetEffectParams: (id: string) => void
  applyEffectParams: (id: string, params: EffectParams) => void

  selectEffect: (id: string | null) => void
  setCamera: (patch: Partial<CameraState>) => void
  toggleBeforeAfter: () => void
  updateExportSettings: (patch: Partial<ExportSettings>) => void
  updateRecipeField: (patch: Partial<PromptRecipe>) => void

  undo: () => void
  redo: () => void
}

function cloneEffects(effects: EffectNode[]): EffectNode[] {
  return structuredClone(effects)
}

function pushHistory(history: HistoryState, currentEffects: EffectNode[]): HistoryState {
  const past = [...history.past, cloneEffects(currentEffects)].slice(-MAX_HISTORY_LENGTH)
  return { past, future: [] }
}

function touchProject(project: ImageProject): ImageProject {
  return { ...project, updatedAt: new Date().toISOString() }
}

function createEmptyProject(file: File, metadata: OriginalImageMetadata): ImageProject {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: file.name,
    createdAt: now,
    updatedAt: now,
    originalImageId: crypto.randomUUID(),
    originalMetadata: metadata,
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
  }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  assets: { originalFile: null, originalBitmap: null, previewBitmap: null },
  history: { past: [], future: [] },
  selectedEffectId: null,
  showBeforeAfter: false,
  isLoading: false,
  loadError: null,
  isSaving: false,
  saveError: null,

  clearLoadError: () => set({ loadError: null }),

  loadImage: async (file) => {
    const validation = validateImageFile(file)
    if (!validation.ok) {
      set({ loadError: validation.error })
      return
    }

    set({ isLoading: true, loadError: null })
    try {
      const { bitmap: originalBitmap, width, height } = await decodeImageFile(file)
      const [previewBitmap, metadata] = await Promise.all([
        createPreviewBitmap(originalBitmap),
        readImageMetadata(file, width, height),
      ])

      const previousAssets = get().assets
      previousAssets.originalBitmap?.close()
      previousAssets.previewBitmap?.close()

      set({
        project: createEmptyProject(file, metadata),
        assets: { originalFile: file, originalBitmap, previewBitmap },
        history: { past: [], future: [] },
        selectedEffectId: null,
        showBeforeAfter: false,
        isLoading: false,
      })
      // A newly loaded image invalidates any showcase-preview built from the previous one.
      useViewStore.getState().setView('editor')
    } catch (error) {
      set({
        isLoading: false,
        loadError:
          error instanceof Error
            ? `Kunne ikke lese bildet: ${error.message}`
            : 'Kunne ikke lese bildet.',
      })
    }
  },

  loadSavedProject: async (storedProject) => {
    set({ isLoading: true, loadError: null })
    try {
      const blob = await loadProjectOriginal(storedProject.originalImageId)
      if (!blob) throw new Error('Fant ikke det lagrede originalbildet.')

      const file = new File([blob], storedProject.originalMetadata.fileName, {
        type: storedProject.originalMetadata.mimeType,
      })
      const { bitmap: originalBitmap } = await decodeImageFile(file)
      const previewBitmap = await createPreviewBitmap(originalBitmap)

      const previousAssets = get().assets
      previousAssets.originalBitmap?.close()
      previousAssets.previewBitmap?.close()

      set({
        project: storedProject,
        assets: { originalFile: file, originalBitmap, previewBitmap },
        history: { past: [], future: [] },
        selectedEffectId: null,
        showBeforeAfter: false,
        isLoading: false,
      })
      useViewStore.getState().setView('editor')
    } catch (error) {
      set({
        isLoading: false,
        loadError:
          error instanceof Error
            ? `Kunne ikke åpne prosjektet: ${error.message}`
            : 'Kunne ikke åpne prosjektet.',
      })
    }
  },

  saveCurrentProject: async () => {
    const { project, assets } = get()
    if (!project || !assets.originalFile) return
    set({ isSaving: true, saveError: null })
    try {
      const touched = touchProject(project)
      await persistProject(touched, assets.originalFile)
      set({ project: touched, isSaving: false })
    } catch (error) {
      set({
        isSaving: false,
        saveError:
          error instanceof Error
            ? `Kunne ikke lagre prosjektet: ${error.message}`
            : 'Kunne ikke lagre prosjektet.',
      })
    }
  },

  addEffect: (type, paramsOverride) => {
    const { project, history } = get()
    if (!project) return
    const node = createEffectNode(type, paramsOverride)
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({ ...project, effects: [...project.effects, node] }),
      selectedEffectId: node.id,
    })
  },

  removeEffect: (id) => {
    const { project, history, selectedEffectId } = get()
    if (!project) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({ ...project, effects: project.effects.filter((e) => e.id !== id) }),
      selectedEffectId: selectedEffectId === id ? null : selectedEffectId,
    })
  },

  duplicateEffect: (id) => {
    const { project, history } = get()
    if (!project) return
    const index = project.effects.findIndex((e) => e.id === id)
    if (index === -1) return
    const duplicate: EffectNode = {
      ...structuredClone(project.effects[index]),
      id: crypto.randomUUID(),
    }
    const effects = [...project.effects]
    effects.splice(index + 1, 0, duplicate)
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({ ...project, effects }),
      selectedEffectId: duplicate.id,
    })
  },

  reorderEffects: (activeId, overId) => {
    const { project, history } = get()
    if (!project || activeId === overId) return
    const oldIndex = project.effects.findIndex((e) => e.id === activeId)
    const newIndex = project.effects.findIndex((e) => e.id === overId)
    if (oldIndex === -1 || newIndex === -1) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({
        ...project,
        effects: arrayMove(project.effects, oldIndex, newIndex),
      }),
    })
  },

  toggleEffectEnabled: (id) => {
    const { project, history } = get()
    if (!project) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({
        ...project,
        effects: project.effects.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
      }),
    })
  },

  setEffectOpacity: (id, opacity, options) => {
    const { project, history } = get()
    if (!project) return
    const commit = options?.commit ?? true
    set({
      history: commit ? pushHistory(history, project.effects) : history,
      project: touchProject({
        ...project,
        effects: project.effects.map((e) => (e.id === id ? { ...e, opacity } : e)),
      }),
    })
  },

  setEffectBlendMode: (id, blendMode) => {
    const { project, history } = get()
    if (!project) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({
        ...project,
        effects: project.effects.map((e) => (e.id === id ? { ...e, blendMode } : e)),
      }),
    })
  },

  updateEffectParam: (id, key, value, options) => {
    const { project, history } = get()
    if (!project) return
    const commit = options?.commit ?? true
    set({
      history: commit ? pushHistory(history, project.effects) : history,
      project: touchProject({
        ...project,
        effects: project.effects.map((e) =>
          e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e,
        ),
      }),
    })
  },

  resetEffectParams: (id) => {
    const { project, history } = get()
    if (!project) return
    const node = project.effects.find((e) => e.id === id)
    if (!node) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({
        ...project,
        effects: project.effects.map((e) =>
          e.id === id ? { ...e, params: defaultParamsFor(node.type) } : e,
        ),
      }),
    })
  },

  applyEffectParams: (id, params) => {
    const { project, history } = get()
    if (!project) return
    set({
      history: pushHistory(history, project.effects),
      project: touchProject({
        ...project,
        effects: project.effects.map((e) => (e.id === id ? { ...e, params } : e)),
      }),
    })
  },

  selectEffect: (id) => set({ selectedEffectId: id }),

  setCamera: (patch) => {
    const { project } = get()
    if (!project) return
    set({ project: { ...project, camera: { ...project.camera, ...patch } } })
  },

  toggleBeforeAfter: () => set((state) => ({ showBeforeAfter: !state.showBeforeAfter })),

  updateExportSettings: (patch) => {
    const { project } = get()
    if (!project) return
    set({ project: { ...project, exportSettings: { ...project.exportSettings, ...patch } } })
  },

  updateRecipeField: (patch) => {
    const { project } = get()
    if (!project) return
    set({ project: { ...project, recipe: { ...project.recipe, ...patch } } })
  },

  undo: () => {
    const { project, history } = get()
    if (!project || history.past.length === 0) return
    const previousEffects = history.past[history.past.length - 1]
    set({
      project: touchProject({ ...project, effects: previousEffects }),
      history: {
        past: history.past.slice(0, -1),
        future: [cloneEffects(project.effects), ...history.future].slice(0, MAX_HISTORY_LENGTH),
      },
    })
  },

  redo: () => {
    const { project, history } = get()
    if (!project || history.future.length === 0) return
    const nextEffects = history.future[0]
    set({
      project: touchProject({ ...project, effects: nextEffects }),
      history: {
        past: [...history.past, cloneEffects(project.effects)].slice(-MAX_HISTORY_LENGTH),
        future: history.future.slice(1),
      },
    })
  },
}))
