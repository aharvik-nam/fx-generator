import { useId, useRef, useState } from 'react'
import { AlertTriangle, Download, FileArchive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useProjectStore } from '@/state/projectStore'
import { RenderPipeline } from '@/engine/pipeline/renderPipeline'
import { extractDominantPaletteFromCanvas } from '@/engine/color/palette'
import { downloadBlob, exportImage } from './imageExport'
import { buildProjectZip } from './zipExport'
import type { ExportImageFormat, MetadataPolicy } from '@/types'

const FORMAT_OPTIONS: { value: ExportImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

const METADATA_POLICY_OPTIONS: { value: MetadataPolicy; label: string }[] = [
  { value: 'strip-all', label: 'Fjern all metadata (anbefalt)' },
  { value: 'strip-sensitive', label: 'Behold generelt, fjern sensitivt' },
  { value: 'keep-all', label: 'Behold all metadata' },
]

export function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isZipExporting, setIsZipExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [useCustomResolution, setUseCustomResolution] = useState(false)
  const [maxDimension, setMaxDimension] = useState(2048)

  const project = useProjectStore((state) => state.project)
  const originalFile = useProjectStore((state) => state.assets.originalFile)
  const originalBitmap = useProjectStore((state) => state.assets.originalBitmap)
  const previewBitmap = useProjectStore((state) => state.assets.previewBitmap)
  const updateExportSettings = useProjectStore((state) => state.updateExportSettings)
  const pipelineRef = useRef(new RenderPipeline())

  const maxDimensionInputId = useId()

  if (!project) return null
  const { exportSettings } = project

  const canKeepMetadata = exportSettings.format === 'jpeg'
  const showMetadataCaveat = !canKeepMetadata && exportSettings.metadataPolicy !== 'strip-all'
  const resolvedSettings = {
    ...exportSettings,
    resolution: useCustomResolution ? ({ maxDimension } as const) : ('original' as const),
  }

  async function handleExport() {
    if (!originalFile || !originalBitmap || !project) return
    setIsExporting(true)
    setExportError(null)
    try {
      const result = await exportImage({
        sourceBitmap: originalBitmap,
        originalFile,
        effects: project.effects,
        settings: resolvedSettings,
        baseName: project.name,
      })
      downloadBlob(result.blob, result.filename)
      setOpen(false)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Eksport feilet av ukjent grunn.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleZipExport() {
    if (!originalFile || !originalBitmap || !project) return
    setIsZipExporting(true)
    setExportError(null)
    try {
      const palette = previewBitmap
        ? extractDominantPaletteFromCanvas(
            pipelineRef.current.compute(previewBitmap, project.effects, 'preview'),
            5,
          )
        : []
      const result = await buildProjectZip({
        sourceBitmap: originalBitmap,
        originalFile,
        project: { ...project, exportSettings: resolvedSettings },
        palette,
      })
      downloadBlob(result.blob, result.filename)
      setOpen(false)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'ZIP-eksport feilet av ukjent grunn.')
    } finally {
      setIsZipExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download aria-hidden="true" />
          Eksporter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eksporter bilde</DialogTitle>
          <DialogDescription>
            Rendrer hele effektkjeden i full oppløsning mot originalbildet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <Label>Format</Label>
            <Select
              value={exportSettings.format}
              onValueChange={(value) =>
                updateExportSettings({ format: value as ExportImageFormat })
              }
            >
              <SelectTrigger size="sm" className="w-28" aria-label="Filformat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {exportSettings.format !== 'png' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Kvalitet</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(exportSettings.quality * 100)}%
                </span>
              </div>
              <Slider
                aria-label="Eksportkvalitet"
                value={[Math.round(exportSettings.quality * 100)]}
                min={10}
                max={100}
                step={1}
                onValueChange={(values) => updateExportSettings({ quality: values[0] / 100 })}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Label>Oppløsning</Label>
            <Select
              value={useCustomResolution ? 'custom' : 'original'}
              onValueChange={(value) => setUseCustomResolution(value === 'custom')}
            >
              <SelectTrigger size="sm" className="w-40" aria-label="Oppløsning">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="custom">Tilpasset maks-dimensjon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {useCustomResolution && (
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor={maxDimensionInputId}
                className="text-muted-foreground text-xs font-normal"
              >
                Maks bredde/høyde (px)
              </Label>
              <Input
                id={maxDimensionInputId}
                type="number"
                min={100}
                max={20000}
                value={maxDimension}
                onChange={(event) =>
                  setMaxDimension(Math.max(100, Number(event.target.value) || 100))
                }
                className="h-8 w-24 text-right"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Label>Metadata</Label>
            <Select
              value={exportSettings.metadataPolicy}
              onValueChange={(value) =>
                updateExportSettings({ metadataPolicy: value as MetadataPolicy })
              }
            >
              <SelectTrigger size="sm" className="w-56" aria-label="Metadata-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METADATA_POLICY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showMetadataCaveat && (
            <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              PNG og WebP kan ikke beholde metadata ved eksport i nettleseren — kun JPEG støtter
              dette. Bildet eksporteres uten metadata.
            </p>
          )}

          {exportError && (
            <p role="alert" className="text-destructive text-sm">
              {exportError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void handleZipExport()}
            disabled={isZipExporting || isExporting}
          >
            {isZipExporting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Pakker...
              </>
            ) : (
              <>
                <FileArchive aria-hidden="true" />
                ZIP (bilde + recipe + prosjekt)
              </>
            )}
          </Button>
          <Button onClick={() => void handleExport()} disabled={isExporting || isZipExporting}>
            {isExporting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Eksporterer...
              </>
            ) : (
              <>
                <Download aria-hidden="true" />
                Last ned
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
