import type { OriginalImageMetadata } from '@/types'

export type SensitiveField = { label: string; description: string }

/** Human-readable breakdown of exactly which sensitive fields were found, for the Metadata panel. */
export function classifySensitiveFields(metadata: OriginalImageMetadata): SensitiveField[] {
  const fields: SensitiveField[] = []

  if (metadata.gps) {
    fields.push({ label: 'GPS-posisjon', description: 'Nøyaktig sted bildet ble tatt.' })
  }

  const serialNumber =
    metadata.exif?.SerialNumber ??
    metadata.exif?.BodySerialNumber ??
    metadata.exif?.LensSerialNumber
  if (typeof serialNumber === 'string' && serialNumber.length > 0) {
    fields.push({
      label: 'Serienummer',
      description: 'Kan identifisere det spesifikke kameraet eller objektivet.',
    })
  }

  if (metadata.captureDate) {
    fields.push({
      label: 'Tidsstempel',
      description: 'Nøyaktig dato og klokkeslett bildet ble tatt.',
    })
  }

  return fields
}
