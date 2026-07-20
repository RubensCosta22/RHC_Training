export const MAX_AVATAR_BYTES = 3 * 1024 * 1024
export const MAX_PROGRESS_BYTES = 6 * 1024 * 1024
const MAX_DIMENSION = 4096
const MAX_PIXELS = 16_000_000

export type ImageInfo = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'jpg' | 'png' | 'webp'
  width: number
  height: number
}

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length))
}

function detectJpeg(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1]
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue }
    if (offset + 4 > bytes.length) return null
    const segmentLength = readUint16BE(bytes, offset + 2)
    if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) return null
    if (sofMarkers.has(marker)) {
      return {
        contentType: 'image/jpeg', extension: 'jpg',
        height: readUint16BE(bytes, offset + 5),
        width: readUint16BE(bytes, offset + 7)
      }
    }
    offset += 2 + segmentLength
  }
  return null
}

function detectPng(bytes: Uint8Array): ImageInfo | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) return null
  if (ascii(bytes, 12, 4) !== 'IHDR') return null
  return {
    contentType: 'image/png', extension: 'png',
    width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20)
  }
}

function detectWebp(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null
  const chunk = ascii(bytes, 12, 4)
  if (chunk === 'VP8X') {
    return {
      contentType: 'image/webp', extension: 'webp',
      width: readUint24LE(bytes, 24) + 1,
      height: readUint24LE(bytes, 27) + 1
    }
  }
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      contentType: 'image/webp', extension: 'webp',
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff
    }
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    return {
      contentType: 'image/webp', extension: 'webp',
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)
    }
  }
  return null
}

export function inspectImage(bytes: Uint8Array) {
  const info = detectJpeg(bytes) || detectPng(bytes) || detectWebp(bytes)
  if (!info || !info.width || !info.height) throw new Error('unsupported or invalid image')
  if (info.width > MAX_DIMENSION || info.height > MAX_DIMENSION || info.width * info.height > MAX_PIXELS) {
    throw new Error('image dimensions exceed safe limit')
  }
  return info
}
