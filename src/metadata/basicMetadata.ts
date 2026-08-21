import type { ImageOrientation, OriginalImageMetadata, SupportedImageMimeType } from '@/types'

function deriveOrientation(width: number, height: number): ImageOrientation {
  if (width === height) return 'square'
  return width > height ? 'landscape' : 'portrait'
}

/**
 * Metadata derivable without a full EXIF/XMP/IPTC read (file name/size/dimensions only).
 * The exifr-based reader that fills in exif/xmp/iptc/gps/camera/lens/exposure lands in M2;
 * this keeps ImageProject fully populated in the meantime since those fields are optional.
 */
export function deriveBasicMetadata(
  file: File,
  width: number,
  height: number,
): OriginalImageMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type as SupportedImageMimeType,
    dimensions: { width, height },
    orientation: deriveOrientation(width, height),
    hasSensitiveData: false,
  }
}
