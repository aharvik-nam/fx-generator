export type ExportImageFormat = 'png' | 'jpeg' | 'webp'

/**
 * `strip-all` removes every metadata field on export (default). `strip-sensitive` keeps
 * general fields (camera, lens, exposure) but drops GPS/serial/precise timestamps.
 * `keep-all` preserves everything read from the original — only fully supported for JPEG
 * (re-injected via piexifjs); PNG/WebP cannot carry it back through a canvas re-encode.
 */
export type MetadataPolicy = 'strip-all' | 'strip-sensitive' | 'keep-all'

export type ExportResolution = 'original' | { maxDimension: number }

export type ExportSettings = {
  format: ExportImageFormat
  quality: number
  resolution: ExportResolution
  metadataPolicy: MetadataPolicy
}
