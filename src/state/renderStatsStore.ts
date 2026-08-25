import { create } from 'zustand'

type RenderStatsStore = {
  lastRenderMs: number | null
  setLastRenderMs: (ms: number) => void
}

/** Separate from projectStore so a render-time update doesn't trigger re-renders of every
 * projectStore subscriber — only StatusBar needs this. */
export const useRenderStatsStore = create<RenderStatsStore>((set) => ({
  lastRenderMs: null,
  setLastRenderMs: (ms) => set({ lastRenderMs: ms }),
}))
