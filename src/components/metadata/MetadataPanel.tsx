import { AlertTriangle, MapPin } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { classifySensitiveFields } from '@/metadata/metadataPolicy'
import { useProjectStore } from '@/state/projectStore'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCoordinate(value: number, positiveLabel: string, negativeLabel: string): string {
  const label = value >= 0 ? positiveLabel : negativeLabel
  return `${Math.abs(value).toFixed(4)}° ${label}`
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate text-right font-medium ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

export function MetadataPanel() {
  const metadata = useProjectStore((state) => state.project?.originalMetadata)

  if (!metadata) {
    return <p className="text-muted-foreground p-3 text-sm">Last opp et bilde for å se metadata.</p>
  }

  const sensitiveFields = classifySensitiveFields(metadata)
  const hasExposure =
    metadata.exposure && Object.values(metadata.exposure).some((value) => value !== undefined)

  return (
    <div className="flex flex-col gap-4 p-3">
      {sensitiveFields.length > 0 && (
        <div className="border-warning-border bg-warning-background flex flex-col gap-1.5 rounded-md border p-2.5 text-xs">
          <div className="text-warning flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Sensitiv metadata funnet
          </div>
          <ul className="text-muted-foreground list-inside list-disc">
            {sensitiveFields.map((field) => (
              <li key={field.label}>
                <span className="text-foreground">{field.label}</span> — {field.description}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Fjernes automatisk ved eksport med mindre du eksplisitt velger å beholde metadata.
          </p>
        </div>
      )}

      <dl>
        <MetadataRow label="Filnavn" value={metadata.fileName} />
        <MetadataRow label="Filstørrelse" value={formatFileSize(metadata.fileSize)} mono />
        <MetadataRow
          label="Dimensjoner"
          value={`${metadata.dimensions.width} × ${metadata.dimensions.height} px`}
          mono
        />
        <MetadataRow label="Orientering" value={metadata.orientation} />
      </dl>

      {metadata.camera && (metadata.camera.make || metadata.camera.model) && (
        <>
          <Separator />
          <dl>
            {metadata.camera.make && (
              <MetadataRow label="Kameramerke" value={metadata.camera.make} />
            )}
            {metadata.camera.model && (
              <MetadataRow label="Kameramodell" value={metadata.camera.model} />
            )}
            {metadata.lens?.model && <MetadataRow label="Objektiv" value={metadata.lens.model} />}
          </dl>
        </>
      )}

      {hasExposure && (
        <>
          <Separator />
          <dl>
            {metadata.exposure?.iso !== undefined && (
              <MetadataRow label="ISO" value={String(metadata.exposure.iso)} mono />
            )}
            {metadata.exposure?.fNumber !== undefined && (
              <MetadataRow label="Blender" value={`f/${metadata.exposure.fNumber}`} mono />
            )}
            {metadata.exposure?.exposureTime && (
              <MetadataRow label="Lukkertid" value={metadata.exposure.exposureTime} mono />
            )}
            {metadata.exposure?.focalLength !== undefined && (
              <MetadataRow label="Brennvidde" value={`${metadata.exposure.focalLength} mm`} mono />
            )}
          </dl>
        </>
      )}

      {metadata.captureDate && (
        <>
          <Separator />
          <dl>
            <MetadataRow
              label="Tatt"
              value={new Date(metadata.captureDate).toLocaleString('nb-NO')}
            />
          </dl>
        </>
      )}

      {metadata.gps && (
        <>
          <Separator />
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="font-mono">
              {formatCoordinate(metadata.gps.latitude, 'N', 'S')},{' '}
              {formatCoordinate(metadata.gps.longitude, 'Ø', 'V')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
