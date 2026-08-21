import { create } from 'zustand'

export type AppView = 'editor' | 'showcase-editor' | 'showcase-preview'

type ViewStore = {
  view: AppView
  setView: (view: AppView) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  view: 'editor',
  setView: (view) => set({ view }),
}))
