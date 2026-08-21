import { CanvasViewport } from '@/components/editor/CanvasViewport'
import { UploadDropzone } from '@/components/editor/UploadDropzone'
import { useProjectStore } from '@/state/projectStore'

export function CanvasArea() {
  const hasProject = useProjectStore((state) => state.project !== null)

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {hasProject ? <CanvasViewport /> : <UploadDropzone />}
    </main>
  )
}
