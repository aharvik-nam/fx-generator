import type { SupportedImageMimeType } from '@/types'

const ACCEPTED_MIME_TYPES: readonly SupportedImageMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export type FileValidationResult = { ok: true } | { ok: false; error: string }

function isSupportedMimeType(type: string): type is SupportedImageMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type)
}

export function validateImageFile(file: File): FileValidationResult {
  if (!isSupportedMimeType(file.type)) {
    return {
      ok: false,
      error: `Filtypen "${file.type || 'ukjent'}" støttes ikke. Bruk JPG, PNG eller WebP.`,
    }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `Filen er for stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Maks er ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    }
  }
  if (file.size === 0) {
    return { ok: false, error: 'Filen er tom eller kan ikke leses.' }
  }
  return { ok: true }
}
