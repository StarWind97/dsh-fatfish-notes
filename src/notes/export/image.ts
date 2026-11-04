import { ExportError } from './model.js'
import { EXPORT_LIMITS } from './layout.js'

/** Bounded header inspection before asking a decoder to allocate a full raster. */
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (start: number, count: number) => String.fromCharCode(...bytes.subarray(start, start + count))
  let width = 0, height = 0
  try {
    if (ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR') { width = view.getUint32(16); height = view.getUint32(20) }
    else if (['GIF87a','GIF89a'].includes(ascii(0, 6))) { width = view.getUint16(6, true); height = view.getUint16(8, true) }
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
      const chunk = ascii(12, 4)
      if (chunk === 'VP8X') { width = 1 + (view.getUint32(24, true) & 0xffffff); height = 1 + (view.getUint32(26, true) >>> 8) }
      else if (chunk === 'VP8L' && bytes[20] === 0x2f) { const bits = view.getUint32(21, true); width = 1 + (bits & 0x3fff); height = 1 + ((bits >>> 14) & 0x3fff) }
      else if (chunk === 'VP8 ' && ascii(23, 3) === '\x9d\x01\x2a') { width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff }
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2
      while (offset + 4 < bytes.length) {
        if (bytes[offset++] !== 0xff) break
        while (bytes[offset] === 0xff) offset++
        const marker = bytes[offset++]!
        if (marker === 0xd9 || marker === 0xda) break
        if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue
        const length = view.getUint16(offset)
        if (length < 2 || offset + length > bytes.length) break
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) { height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break }
        offset += length
      }
    }
  } catch { throw new ExportError('export_image_decode') }
  if (!width || !height) throw new ExportError('export_image_decode')
  if (width > EXPORT_LIMITS.side || height > EXPORT_LIMITS.side || width * height > EXPORT_LIMITS.imagePixels) throw new ExportError('export_image_budget')
  return { width, height }
}
