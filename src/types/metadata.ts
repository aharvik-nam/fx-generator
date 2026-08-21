export type Dimensions = {
  width: number
  height: number
}

export type ImageOrientation = 'landscape' | 'portrait' | 'square'

export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

export type GpsCoordinates = {
  latitude: number
  longitude: number
  altitude?: number
}

export type CameraInfo = {
  make?: string
  model?: string
}

export type LensInfo = {
  model?: string
}

export type ExposureInfo = {
  iso?: number
  fNumber?: number
  exposureTime?: string
  focalLength?: number
}

/**
 * Normalized metadata read from the original file. `exif`/`xmp`/`iptc` keep the raw
 * reader output for the Metadata panel and Recipe generator; the typed fields below are
 * convenience extractions of the values the UI actually surfaces.
 */
export type OriginalImageMetadata = {
  fileName: string
  fileSize: number
  mimeType: SupportedImageMimeType
  dimensions: Dimensions
  orientation: ImageOrientation
  exif?: Record<string, unknown>
  xmp?: Record<string, unknown>
  iptc?: Record<string, unknown>
  gps?: GpsCoordinates
  camera?: CameraInfo
  lens?: LensInfo
  captureDate?: string
  exposure?: ExposureInfo
  /** True when GPS, serial number, or a precise capture timestamp is present. */
  hasSensitiveData: boolean
}
