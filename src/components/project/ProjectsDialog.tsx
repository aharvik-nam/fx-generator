import { useState } from 'react'
import { FolderOpen, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { deleteProject, listProjects } from '@/persistence/projectRepository'
import { useProjectStore } from '@/state/projectStore'
import type { ImageProject } from '@/types'

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ProjectsDialog() {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<ImageProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSavedProject = useProjectStore((state) => state.loadSavedProject)
  const isProjectLoading = useProjectStore((state) => state.isLoading)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setProjects(await listProjects())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Kunne ikke laste prosjektlisten.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOpen(project: ImageProject) {
    await loadSavedProject(project)
    setOpen(false)
  }

  async function handleDelete(project: ImageProject) {
    if (pendingDeleteId !== project.id) {
      setPendingDeleteId(project.id)
      return
    }
    await deleteProject(project)
    setPendingDeleteId(null)
    await refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setPendingDeleteId(null)
        if (next) void refresh()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen aria-hidden="true" />
          Prosjekter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lagrede prosjekter</DialogTitle>
          <DialogDescription>
            Åpne eller slett prosjekter lagret lokalt i denne nettleseren.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="text-muted-foreground flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
        )}

        {!isLoading && error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <p className="text-muted-foreground text-sm">Ingen lagrede prosjekter ennå.</p>
        )}

        {!isLoading && projects.length > 0 && (
          <ScrollArea className="max-h-80">
            <ul className="flex flex-col gap-1.5">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="border-border flex items-center justify-between gap-2 rounded-md border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatUpdatedAt(project.updatedAt)} · {project.effects.length} effekt(er)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isProjectLoading}
                      onClick={() => void handleOpen(project)}
                    >
                      Åpne
                    </Button>
                    <Button
                      type="button"
                      variant={pendingDeleteId === project.id ? 'destructive' : 'ghost'}
                      size="icon"
                      aria-label={
                        pendingDeleteId === project.id
                          ? `Bekreft sletting av ${project.name}`
                          : `Slett ${project.name}`
                      }
                      onClick={() => void handleDelete(project)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
