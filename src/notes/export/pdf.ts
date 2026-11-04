import PDFDocument from 'pdfkit'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import type { ExportModel, ExportImage } from './model.js'
import { layoutExport } from './layout.js'
import { imageDimensions } from './image.js'

export const exportFontPath = fileURLToPath(new URL('../../../assets/fonts/NotoSansCJKsc-Regular.otf', import.meta.url))
export function exportFont(): Promise<Buffer> { return readFile(exportFontPath) }

export async function exportPdf(model: ExportModel, images: Record<string, Buffer>, signal?: AbortSignal): Promise<Buffer> {
  signal?.throwIfAborted()
  const font = await exportFont(), doc = new PDFDocument({ autoFirstPage: false, compress: true, info: { Title: model.title, Creator: 'DSH笔记' } })
  const chunks: Buffer[] = []
  const result = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk as Buffer)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject) })
  // Prevent an early stream failure becoming an unhandled rejection during layout.
  void result.catch(() => {})
  try {
    doc.registerFont('Noto', font).font('Noto')
    const dimensions: Record<string, ExportImage> = {}, sources: Record<string, string> = {}
    for (const [id, bytes] of Object.entries(images)) {
      const image = imageDimensions(bytes)
      dimensions[id] = { dataUrl: '', width: image.width, height: image.height }
      // PDFKit reuses repeated string sources. Only controlled in-memory image data, never paths.
      sources[id] = `data:image/${bytes[0] === 0xff ? 'jpeg' : 'png'};base64,${bytes.toString('base64')}`
    }
    const widths = new Map<string, number>()
    const measure = (text: string, size: number) => { const key = `${size}:${text}`, prior = widths.get(key); if (prior !== undefined) return prior; const width = doc.fontSize(size).widthOfString(text); if (text.length < 8) widths.set(key, width); return width }
    const pages = layoutExport(model, dimensions, measure, 595.28, 841.89)
    for (const page of pages) {
      signal?.throwIfAborted(); doc.addPage({ size: [page.width, page.height], margin: 0 })
      for (const item of page.items) {
        if (item.type === 'image') doc.image(sources[item.assetId]!, item.x, item.y, { width: item.width, height: item.height })
        else if (item.type === 'line') doc.save().lineWidth(0.5).strokeColor('#cccccc').moveTo(item.x, item.y).lineTo(item.x + item.width, item.y).stroke().restore()
        else {
          if (item.shade) doc.save().rect(item.x - 3, item.y, item.width + 6, item.height).fill('#f0f2f5').restore()
          if (item.quote) doc.save().lineWidth(2).strokeColor('#bbbbbb').moveTo(item.x - 5, item.y).lineTo(item.x - 5, item.y + item.height).stroke().restore()
          let x = item.x
          for (const run of item.runs) {
            doc.font('Noto').fontSize(item.size).fillColor(run.href ? '#1759a4' : '#17212b')
            doc.text(run.text, x, item.y, { lineBreak: false, ...(run.href ? { link: run.href, underline: true } : {}), ...(run.strong ? { stroke: true } : {}) })
            x += measure(run.text, item.size)
          }
        }
      }
      // Let cancellation and request disconnects run between pages.
      await new Promise<void>(resolve => setImmediate(resolve))
    }
    signal?.throwIfAborted(); doc.end(); return await result
  } catch (error) { doc.destroy(); throw error }
}
