import piexif from 'piexifjs'
import type { MetadataPolicy } from '@/types'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () =>
      reject(reader.error ?? new Error('Kunne ikke lese bildedata.')),
    )
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*?);/.exec(header)
  const mime = mimeMatch?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const SENSITIVE_EXIF_TAGS = [
  piexif.ExifIFD.DateTimeOriginal,
  piexif.ExifIFD.DateTimeDigitized,
  piexif.ExifIFD.SubSecTimeOriginal,
  piexif.ExifIFD.BodySerialNumber,
  piexif.ExifIFD.LensSerialNumber,
]

const SENSITIVE_IMAGE_TAGS = [piexif.ImageIFD.DateTime]

/**
 * Re-injects EXIF into a freshly re-encoded JPEG blob. Canvas re-encoding (toBlob/
 * convertToBlob) always strips every metadata segment, for every format — this is what makes
 * "keep metadata" possible for JPEG at all. Reads the ORIGINAL file's raw EXIF (not the
 * exported image's, which has none) via piexif.load, optionally strips sensitive tags, and
 * inserts the result into the new JPEG bytes. PNG/WebP have no equivalent lightweight path,
 * so this is JPEG-only by design (see ExportDialog for the user-facing caveat).
 */
export async function injectMetadataIntoJpeg(
  jpegBlob: Blob,
  originalFile: File,
  policy: MetadataPolicy,
): Promise<Blob> {
  if (policy === 'strip-all') return jpegBlob

  const originalDataUrl = await blobToDataUrl(originalFile)

  let exifDict: piexif.ExifDict
  try {
    exifDict = piexif.load(originalDataUrl)
  } catch {
    // Original had no readable EXIF (e.g. it was PNG-like content in a .jpg, or already
    // stripped) — nothing to carry forward.
    return jpegBlob
  }

  if (policy === 'strip-sensitive') {
    exifDict.GPS = {}
    if (exifDict.Exif) {
      for (const tag of SENSITIVE_EXIF_TAGS) delete exifDict.Exif[tag]
    }
    if (exifDict['0th']) {
      for (const tag of SENSITIVE_IMAGE_TAGS) delete exifDict['0th'][tag]
    }
  }

  // The embedded thumbnail is a small preview of the ORIGINAL (pre-edit) pixels — keeping it
  // would leave a second, unedited copy of the image hidden inside an "edited" export.
  delete exifDict.thumbnail
  exifDict['1st'] = {}

  const exifBytes = piexif.dump(exifDict)
  const newDataUrl = await blobToDataUrl(jpegBlob)
  const injectedDataUrl = piexif.insert(exifBytes, newDataUrl)
  return dataUrlToBlob(injectedDataUrl)
}
