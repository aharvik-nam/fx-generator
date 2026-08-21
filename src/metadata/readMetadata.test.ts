import { describe, expect, it } from 'vitest'
import { formatExposureTime } from './readMetadata'

describe('formatExposureTime', () => {
  it('formats sub-second exposures as a 1/x fraction', () => {
    expect(formatExposureTime(0.004)).toBe('1/250')
    expect(formatExposureTime(0.008)).toBe('1/125')
  })

  it('formats exposures of 1 second or longer with an "s" suffix', () => {
    expect(formatExposureTime(2)).toBe('2s')
    expect(formatExposureTime(1)).toBe('1s')
  })

  it('returns undefined for missing or invalid input', () => {
    expect(formatExposureTime(undefined)).toBeUndefined()
    expect(formatExposureTime(0)).toBeUndefined()
    expect(formatExposureTime(-1)).toBeUndefined()
  })
})
