import { CanvasArea } from '@/components/layout/CanvasArea'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { RightPanel } from '@/components/layout/RightPanel'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function EditorView() {
  useKeyboardShortcuts()

  return (
    <div className="flex min-h-0 flex-1">
      <LeftPanel />
      <CanvasArea />
      <RightPanel />
    </div>
  )
}
