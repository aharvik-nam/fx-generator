import { describe, expect, it } from 'vitest'
import { blobToDataUrl, dataUrlToBlob } from './blob'

describe('blobToDataUrl / dataUrlToBlob', () => {
  it('round-trips a blob through a data URL', async () => {
    const original = new Blob(['hello world'], { type: 'text/plain' })
    const dataUrl = await blobToDataUrl(original)
    expect(dataUrl).toMatch(/^data:text\/plain;base64,/)

    const restored = dataUrlToBlob(dataUrl)
    expect(restored.type).toBe('text/plain')
    expect(await restored.text()).toBe('hello world')
  })

  it('falls back to a generic mime type when the data URL has none', () => {
    const blob = dataUrlToBlob('data:;base64,aGVsbG8=')
    expect(blob.type).toBe('application/octet-stream')
  })
})
