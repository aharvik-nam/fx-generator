import { describe, expect, it } from 'vitest'
import type { OriginalImageMetadata } from '@/types'
import { classifySensitiveFields } from './metadataPolicy'

function baseMetadata(overrides: Partial<OriginalImageMetadata> = {}): OriginalImageMetadata {
  return {
    fileName: 'test.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    dimensions: { width: 100, height: 100 },
    orientation: 'square',
    hasSensitiveData: false,
    ...overrides,
  }
}

describe('classifySensitiveFields', () => {
  it('returns nothing for metadata with no sensitive fields', () => {
    expect(classifySensitiveFields(baseMetadata())).toEqual([])
  })

  it('flags GPS coordinates', () => {
    const fields = classifySensitiveFields(
      baseMetadata({ gps: { latitude: 59.9, longitude: 10.7 } }),
    )
    expect(fields.map((f) => f.label)).toContain('GPS-posisjon')
  })

  it('flags a serial number found under any of the common exif tag names', () => {
    const fields = classifySensitiveFields(baseMetadata({ exif: { SerialNumber: 'ABC123' } }))
    expect(fields.map((f) => f.label)).toContain('Serienummer')
  })

  it('flags a capture timestamp', () => {
    const fields = classifySensitiveFields(
      baseMetadata({ captureDate: '2024-01-01T10:00:00.000Z' }),
    )
    expect(fields.map((f) => f.label)).toContain('Tidsstempel')
  })

  it('flags all three when all are present', () => {
    const fields = classifySensitiveFields(
      baseMetadata({
        gps: { latitude: 1, longitude: 1 },
        exif: { BodySerialNumber: 'X' },
        captureDate: '2024-01-01T10:00:00.000Z',
      }),
    )
    expect(fields).toHaveLength(3)
  })
})
