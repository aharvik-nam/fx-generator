import { useCallback, useId, useState } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/state/projectStore'

export function UploadDropzone() {
  const loadImage = useProjectStore((state) => state.loadImage)
  const isLoading = useProjectStore((state) => state.isLoading)
  const loadError = useProjectStore((state) => state.loadError)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputId = useId()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) void loadImage(file)
    },
    [loadImage],
  )

  return (
    <div className="bg-muted/30 flex flex-1 items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <label
          htmlFor={inputId}
          className={cn(
            'border-border flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
            'hover:border-primary/60 hover:bg-primary/5',
            'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
            isDragOver && 'border-primary bg-primary/5',
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragOver(false)
            handleFiles(event.dataTransfer.files)
          }}
        >
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
          {isLoading ? (
            <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="text-muted-foreground size-8" aria-hidden="true" />
          )}
          <div className="text-sm">
            <p className="font-medium">Dra og slipp et bilde her, eller klikk for å velge</p>
            <p className="text-muted-foreground mt-1">JPG, PNG eller WebP</p>
          </div>
        </label>
        {loadError && (
          <p role="alert" className="text-destructive text-sm">
            {loadError}
          </p>
        )}
      </div>
    </div>
  )
}
