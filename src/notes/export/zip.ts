import { zipSync } from 'fflate'
export function exportZip(filename: string, markdown: string, images: Record<string, Buffer>): Buffer {
  const files: Record<string, Uint8Array> = { [filename+'.md']: Buffer.from(markdown) }
  for (const [assetId, bytes] of Object.entries(images)) files[`assets/${assetId}`] = bytes
  return Buffer.from(zipSync(files, { level: 6 }))
}
