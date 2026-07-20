import { describe, expect, it } from 'vitest'
import { inspectImage } from './imageInspection'

function png(width: number, height: number) {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  bytes.set([73, 72, 68, 82], 12)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

function jpeg(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x01, 0x01, 0x11, 0x00
  ])
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30)
  bytes.set([...new TextEncoder().encode('RIFF'), 22, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8X')], 0)
  const w = width - 1
  const h = height - 1
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24)
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27)
  return bytes
}

describe('imageInspection', () => {
  it('detecta dimensoes e MIME pelos bytes reais', () => {
    expect(inspectImage(jpeg(800, 600))).toMatchObject({ contentType: 'image/jpeg', width: 800, height: 600 })
    expect(inspectImage(png(1024, 768))).toMatchObject({ contentType: 'image/png', width: 1024, height: 768 })
    expect(inspectImage(webp(1200, 900))).toMatchObject({ contentType: 'image/webp', width: 1200, height: 900 })
  })

  it('rejeita arquivo falso e dimensoes excessivas', () => {
    expect(() => inspectImage(new Uint8Array([1, 2, 3]))).toThrow('invalid image')
    expect(() => inspectImage(png(5000, 100))).toThrow('dimensions')
    expect(() => inspectImage(png(4096, 4096))).toThrow('dimensions')
  })
})
