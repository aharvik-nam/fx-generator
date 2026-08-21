export const PREVIEW_MAX_DIMENSION = 1600

export type DecodedImage = {
  bitmap: ImageBitmap
  width: number
  height: number
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file)
  return { bitmap, width: bitmap.width, height: bitmap.height }
}

/**
 * Returns a bitmap capped at PREVIEW_MAX_DIMENSION on its longest side, for fast
 * interactive editing. Always returns a fresh, independent ImageBitmap (never the same
 * object as `source`) so preview and original bitmaps can be closed independently.
 */
export async function createPreviewBitmap(source: ImageBitmap): Promise<ImageBitmap> {
  const longestSide = Math.max(source.width, source.height)
  if (longestSide <= PREVIEW_MAX_DIMENSION) {
    return createImageBitmap(source)
  }
  const scale = PREVIEW_MAX_DIMENSION / longestSide
  return createImageBitmap(source, {
    resizeWidth: Math.max(1, Math.round(source.width * scale)),
    resizeHeight: Math.max(1, Math.round(source.height * scale)),
    resizeQuality: 'high',
  })
}
