import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'
import type { ScrollMode, ShowcaseProject, ShowcaseState } from '@/types'
import { useProjectStore } from './projectStore'
import { generateThumbnailDataUrl } from '@/showcase/thumbnail'
import {
  loadShowcaseByProjectId,
  saveShowcase as persistShowcase,
} from '@/persistence/showcaseRepository'

type ShowcaseStore = {
  showcase: ShowcaseProject | null
  isSaving: boolean
  saveError: string | null

  loadOrCreateForProject: (projectId: string, projectName: string) => Promise<void>
  addStateFromCurrentEditor: () => Promise<void>
  updateStateMeta: (
    id: string,
    patch: Partial<Pick<ShowcaseState, 'name' | 'description' | 'notes'>>,
  ) => void
  duplicateState: (id: string) => void
  removeState: (id: string) => void
  reorderStates: (activeId: string, overId: string) => void
  setStartState: (id: string) => void
  setEndState: (id: string) => void
  setScrollMode: (mode: ScrollMode) => void
  updateTitle: (title: string) => void
  updateTexts: (patch: Partial<ShowcaseProject['texts']>) => void
  updateDisplaySettings: (patch: Partial<ShowcaseProject['displaySettings']>) => void
  saveShowcaseNow: () => Promise<void>
}

function now(): string {
  return new Date().toISOString()
}

function createEmptyShowcase(projectId: string, projectName: string): ShowcaseProject {
  const timestamp = now()
  return {
    id: crypto.randomUUID(),
    projectId,
    title: `${projectName} — Showcase`,
    states: [],
    startStateId: '',
    endStateId: '',
    scrollMode: 'vertical-story',
    texts: {},
    displaySettings: { showMetadata: false, showParams: true },
    exportSettings: {
      format: 'png',
      quality: 0.92,
      resolution: 'original',
      metadataPolicy: 'strip-all',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const useShowcaseStore = create<ShowcaseStore>((set, get) => ({
  showcase: null,
  isSaving: false,
  saveError: null,

  loadOrCreateForProject: async (projectId, projectName) => {
    const { showcase } = get()
    if (showcase && showcase.projectId === projectId) return
    const existing = await loadShowcaseByProjectId(projectId)
    set({ showcase: existing ?? createEmptyShowcase(projectId, projectName), saveError: null })
  },

  addStateFromCurrentEditor: async () => {
    const { showcase } = get()
    const { project, assets } = useProjectStore.getState()
    if (!showcase || !project || !assets.previewBitmap) return

    const thumbnail = await generateThumbnailDataUrl(assets.previewBitmap, project.effects)
    const timestamp = now()
    const newState: ShowcaseState = {
      id: crypto.randomUUID(),
      name: `State ${showcase.states.length + 1}`,
      effectNodes: structuredClone(project.effects),
      camera: { ...project.camera },
      thumbnail,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const current = get().showcase
    if (!current) return
    const states = [...current.states, newState]
    set({
      showcase: {
        ...current,
        states,
        startStateId: current.startStateId || newState.id,
        endStateId: newState.id,
        updatedAt: timestamp,
      },
    })
  },

  updateStateMeta: (id, patch) => {
    const { showcase } = get()
    if (!showcase) return
    const timestamp = now()
    set({
      showcase: {
        ...showcase,
        states: showcase.states.map((state) =>
          state.id === id ? { ...state, ...patch, updatedAt: timestamp } : state,
        ),
        updatedAt: timestamp,
      },
    })
  },

  duplicateState: (id) => {
    const { showcase } = get()
    if (!showcase) return
    const index = showcase.states.findIndex((state) => state.id === id)
    if (index === -1) return
    const timestamp = now()
    const duplicate: ShowcaseState = {
      ...structuredClone(showcase.states[index]),
      id: crypto.randomUUID(),
      name: `${showcase.states[index].name} (kopi)`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const states = [...showcase.states]
    states.splice(index + 1, 0, duplicate)
    set({ showcase: { ...showcase, states, updatedAt: timestamp } })
  },

  removeState: (id) => {
    const { showcase } = get()
    if (!showcase) return
    const states = showcase.states.filter((state) => state.id !== id)
    set({
      showcase: {
        ...showcase,
        states,
        startStateId: showcase.startStateId === id ? (states[0]?.id ?? '') : showcase.startStateId,
        endStateId: showcase.endStateId === id ? (states.at(-1)?.id ?? '') : showcase.endStateId,
        updatedAt: now(),
      },
    })
  },

  reorderStates: (activeId, overId) => {
    const { showcase } = get()
    if (!showcase || activeId === overId) return
    const oldIndex = showcase.states.findIndex((state) => state.id === activeId)
    const newIndex = showcase.states.findIndex((state) => state.id === overId)
    if (oldIndex === -1 || newIndex === -1) return
    set({
      showcase: {
        ...showcase,
        states: arrayMove(showcase.states, oldIndex, newIndex),
        updatedAt: now(),
      },
    })
  },

  setStartState: (id) => {
    const { showcase } = get()
    if (!showcase) return
    set({ showcase: { ...showcase, startStateId: id, updatedAt: now() } })
  },

  setEndState: (id) => {
    const { showcase } = get()
    if (!showcase) return
    set({ showcase: { ...showcase, endStateId: id, updatedAt: now() } })
  },

  setScrollMode: (mode) => {
    const { showcase } = get()
    if (!showcase) return
    set({ showcase: { ...showcase, scrollMode: mode, updatedAt: now() } })
  },

  updateTitle: (title) => {
    const { showcase } = get()
    if (!showcase) return
    set({ showcase: { ...showcase, title, updatedAt: now() } })
  },

  updateTexts: (patch) => {
    const { showcase } = get()
    if (!showcase) return
    set({ showcase: { ...showcase, texts: { ...showcase.texts, ...patch }, updatedAt: now() } })
  },

  updateDisplaySettings: (patch) => {
    const { showcase } = get()
    if (!showcase) return
    set({
      showcase: {
        ...showcase,
        displaySettings: { ...showcase.displaySettings, ...patch },
        updatedAt: now(),
      },
    })
  },

  saveShowcaseNow: async () => {
    const { showcase } = get()
    if (!showcase) return
    set({ isSaving: true, saveError: null })
    try {
      const touched = { ...showcase, updatedAt: now() }
      await persistShowcase(touched)
      set({ showcase: touched, isSaving: false })
    } catch (error) {
      set({
        isSaving: false,
        saveError:
          error instanceof Error
            ? `Kunne ikke lagre showcase: ${error.message}`
            : 'Kunne ikke lagre showcase.',
      })
    }
  },
}))
