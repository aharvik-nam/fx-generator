import type { ImageProject } from '@/types'

/** Shared by every scroll mode that can show a metadata line under a rendered state. */
export function formatMetadataExcerpt(metadata: ImageProject['originalMetadata']): string | null {
  const parts: string[] = []
  const camera = [metadata.camera?.make, metadata.camera?.model].filter(Boolean).join(' ')
  if (camera) parts.push(camera)
  if (metadata.lens?.model) parts.push(metadata.lens.model)
  if (metadata.exposure?.iso !== undefined) parts.push(`ISO ${metadata.exposure.iso}`)
  if (metadata.exposure?.fNumber !== undefined) parts.push(`f/${metadata.exposure.fNumber}`)
  if (metadata.exposure?.exposureTime) parts.push(metadata.exposure.exposureTime)
  if (parts.length === 0)
    parts.push(`${metadata.dimensions.width} × ${metadata.dimensions.height} px`)
  return parts.join(' · ')
}
