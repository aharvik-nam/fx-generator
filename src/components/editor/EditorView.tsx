import { useEffect } from 'react'
import { CanvasArea } from '@/components/layout/CanvasArea'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { MobilePanelBar } from '@/components/layout/MobilePanelBar'
import { RightPanel } from '@/components/layout/RightPanel'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePresetStore } from '@/state/presetStore'
import { useChainPresetStore } from '@/state/chainPresetStore'

export function EditorView() {
  useKeyboardShortcuts()

  // Loaded here (not inside EffectLibrary/EffectStack) because those live inside mobile Sheets
  // that don't mount until opened — EditorView is always mounted, so presets are ready either way.
  const loadPresets = usePresetStore((state) => state.loadPresets)
  const loadChainPresets = useChainPresetStore((state) => state.loadChainPresets)
  useEffect(() => {
    void loadPresets()
    void loadChainPresets()
  }, [loadPresets, loadChainPresets])

  return (
    <div className="flex min-h-0 flex-1">
      <LeftPanel />
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePanelBar />
        <CanvasArea />
      </div>
      <RightPanel />
    </div>
  )
}
