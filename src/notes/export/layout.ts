import { ExportError, type ExportModel, type ExportRun, type ExportImage } from './model.js'

export const EXPORT_LIMITS = { side: 32767, pixels: 32_000_000, pages: 500, imagePixels: 32_000_000 } as const
export type Draw =
  | { type: 'text'; x: number; y: number; width: number; height: number; size: number; runs: ExportRun[]; shade: boolean; quote: boolean }
  | { type: 'image'; x: number; y: number; width: number; height: number; assetId: string; alt: string }
  | { type: 'line'; x: number; y: number; width: number; height: number }
export interface ExportPage { width: number; height: number; items: Draw[] }
export type Measure = (text: string, size: number) => number
export function checkPixels(width: number, height: number, ratio: number): void {
  if (![width, height, ratio].every(Number.isFinite) || width < 1 || height < 1 || ratio < 1 || ratio > 2) throw new ExportError('export_dimensions')
  const w = Math.ceil(width * ratio), h = Math.ceil(height * ratio)
  if (w > EXPORT_LIMITS.side || h > EXPORT_LIMITS.side || w * h > EXPORT_LIMITS.pixels) throw new ExportError('export_overflow')
}
/** Character boundaries preserve Chinese and long unbroken code. Adjacent runs retain links. */
export function wrapRuns(runs: ExportRun[], width: number, size: number, measure: Measure): ExportRun[][] {
  const lines: ExportRun[][] = []; let line: ExportRun[] = [], used = 0
  const flush = () => { lines.push(line); line = []; used = 0 }
  for (const run of runs) {
    let segment = ''
    const push = () => { if (segment) line.push({ ...run, text: segment }); segment = '' }
    for (const char of run.text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')) {
      if (char === '\n') { push(); flush(); continue }
      const n = measure(char, size)
      if (used + n > width && (line.length || segment)) { push(); flush() }
      segment += char; used += n
    }
    push()
  }
  if (line.length || !lines.length || runs.at(-1)?.text.endsWith('\n')) lines.push(line)
  return lines
}

/** Both renderers consume these positioned lines. Tall rows split by line, repeating the header. */
export function layoutExport(model: ExportModel, images: Record<string, ExportImage>, measure: Measure, width: number, pageHeight: number | null): ExportPage[] {
  const scale = width / 1080, margin = 48 * scale, size = 24 * scale, gap = 18 * scale, inner = width - margin * 2
  const pages: ExportPage[] = []; let page: ExportPage = { width, height: pageHeight ?? 1, items: [] }, y = margin
  const finish = () => { page.height = pageHeight ?? Math.ceil(y + margin); pages.push(page); if (pages.length > EXPORT_LIMITS.pages) throw new ExportError('export_page_limit') }
  const next = () => { finish(); page = { width, height: pageHeight ?? 1, items: [] }; y = margin }
  const fits = (h: number) => pageHeight === null || y + h <= pageHeight - margin + 0.01
  const room = (h: number) => { if (!fits(h) && page.items.length) next(); if (!fits(h)) throw new ExportError('export_layout') }
  function textLine(runs: ExportRun[], x: number, w: number, font: number, h: number, shade = false, quote = false) {
    page.items.push({ type: 'text', x, y, width: w, height: h, size: font, runs, shade, quote })
  }
  for (const block of model.blocks) {
    if (block.type === 'text') {
      const font = block.kind === 'heading' ? size * (block.level === 1 ? 1.65 : block.level === 2 ? 1.3 : 1.12) : block.kind === 'meta' ? size * 0.8 : block.kind === 'code' ? size * 0.9 : size
      const h = font * 1.55, inset = ['code','quote'].includes(block.kind) ? 16 * scale : 0
      for (const line of wrapRuns(block.runs, inner - inset * 2, font, measure)) { room(h); textLine(line, margin + inset, inner - inset * 2, font, h, block.kind === 'code', block.kind === 'quote'); y += h }
      y += gap
    } else if (block.type === 'image') {
      const image = images[block.assetId]; if (!image) throw new ExportError('export_image_missing')
      const maxHeight = pageHeight ? pageHeight - margin * 2 : inner * 3
      const factor = Math.min(1, inner / image.width, maxHeight / image.height), w = image.width * factor, h = image.height * factor
      room(h); page.items.push({ type: 'image', x: margin, y, width: w, height: h, assetId: block.assetId, alt: block.alt }); y += h + gap
    } else if (block.type === 'rule') { room(gap); page.items.push({ type: 'line', x: margin, y, width: inner, height: 1 }); y += gap }
    else {
      const columns = Math.max(...block.rows.map(row => row.length)), cell = inner / columns, padding = 9 * scale, lineHeight = size * 1.5
      if (cell < size * 2) throw new ExportError('export_table_width')
      const rows = block.rows.map(row => Array.from({ length: columns }, (_, index) => wrapRuns(row[index] ?? [], cell - padding * 2, size, measure)))
      const header = rows[0]; if (!header) continue
      const count = (row: ExportRun[][][]) => Math.max(1, ...row.map(c => c.length))
      const headerHeight = count(header) * lineHeight + padding * 2
      if (pageHeight && headerHeight + lineHeight + padding * 2 > pageHeight - margin * 2) throw new ExportError('export_table_header')
      const drawRow = (row: ExportRun[][][], offset: number, n: number, isHeader: boolean) => {
        const h = n * lineHeight + padding * 2, top = y
        for (let column = 0; column < columns; column++) {
          for (let i = 0; i < n; i++) { y = top + padding + i * lineHeight; textLine(row[column]?.[offset + i] ?? [], margin + column * cell + padding, cell - padding * 2, size, lineHeight, isHeader) }
        }
        y = top + h; page.items.push({ type: 'line', x: margin, y, width: inner, height: scale })
      }
      room(headerHeight + lineHeight + padding * 2); drawRow(header, 0, count(header), true)
      for (const row of rows.slice(1)) {
        let offset = 0; const total = count(row)
        while (offset < total) {
          if (!fits(lineHeight + padding * 2)) { next(); drawRow(header, 0, count(header), true) }
          const available = pageHeight ? Math.floor((pageHeight - margin - y - padding * 2 + 0.01) / lineHeight) : total
          const n = Math.min(total - offset, available); if (n < 1) throw new ExportError('export_layout')
          drawRow(row, offset, n, false); offset += n
        }
      }
      y += gap
    }
  }
  finish(); return pages
}
