import exifr from 'exifr'
import type {
  CameraInfo,
  ExposureInfo,
  GpsCoordinates,
  LensInfo,
  OriginalImageMetadata,
} from '@/types'
import { deriveBasicMetadata } from './basicMetadata'

type ExifrGpsOutput = { latitude?: number; longitude?: number; GPSAltitude?: number }

type ExifrSegments = {
  ifd0?: Record<string, unknown>
  exif?: Record<string, unknown>
  gps?: ExifrGpsOutput
  iptc?: Record<string, unknown>
  xmp?: Record<string, unknown>
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined
}

/** ExposureTime comes back as decimal seconds (e.g. 0.004); classic photography notation is 1/x. */
export function formatExposureTime(seconds: number | undefined): string | undefined {
  if (seconds === undefined || seconds <= 0) return undefined
  if (seconds >= 1) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}`
}

/**
 * Reads EXIF/TIFF/GPS/IPTC/XMP from the original file via `exifr` and normalizes it into
 * `OriginalImageMetadata`. Falls back to `deriveBasicMetadata` alone (no throw) when the file
 * has no readable metadata segments — most PNG/WebP files, or a JPEG stripped upstream.
 */
export async function readImageMetadata(
  file: File,
  width: number,
  height: number,
): Promise<OriginalImageMetadata> {
  const basic = deriveBasicMetadata(file, width, height)

  let segments: ExifrSegments | undefined
  try {
    const raw: unknown = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: { parse: true },
      mergeOutput: false,
      sanitize: true,
    })
    segments = raw as ExifrSegments | undefined
  } catch {
    segments = undefined
  }

  if (!segments) return basic

  const { ifd0, exif, gps: gpsOutput, iptc, xmp } = segments

  const camera: CameraInfo | undefined =
    (asString(ifd0?.Make) ?? asString(ifd0?.Model))
      ? { make: asString(ifd0?.Make), model: asString(ifd0?.Model) }
      : undefined

  const lens: LensInfo | undefined = asString(exif?.LensModel)
    ? { model: asString(exif?.LensModel) }
    : undefined

  const captureDate = (asDate(exif?.DateTimeOriginal) ?? asDate(ifd0?.ModifyDate))?.toISOString()

  const iso = asNumber(exif?.ISO)
  const fNumber = asNumber(exif?.FNumber)
  const exposureTime = formatExposureTime(asNumber(exif?.ExposureTime))
  const focalLength = asNumber(exif?.FocalLength)
  const exposure: ExposureInfo | undefined =
    iso !== undefined ||
    fNumber !== undefined ||
    exposureTime !== undefined ||
    focalLength !== undefined
      ? { iso, fNumber, exposureTime, focalLength }
      : undefined

  const gps: GpsCoordinates | undefined =
    gpsOutput?.latitude !== undefined && gpsOutput.longitude !== undefined
      ? {
          latitude: gpsOutput.latitude,
          longitude: gpsOutput.longitude,
          altitude: asNumber(gpsOutput.GPSAltitude),
        }
      : undefined

  const serialNumber =
    asString(exif?.SerialNumber) ??
    asString(exif?.BodySerialNumber) ??
    asString(exif?.LensSerialNumber)

  return {
    ...basic,
    exif: ifd0 || exif ? { ...ifd0, ...exif } : undefined,
    xmp,
    iptc,
    gps,
    camera,
    lens,
    captureDate,
    exposure,
    hasSensitiveData: Boolean(gps ?? serialNumber ?? captureDate),
  }
}
