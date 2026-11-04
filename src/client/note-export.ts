import { toBlob } from 'html-to-image'
import { zipSync } from 'fflate'
import { ApiError } from './api.js'
import { ExportError, type ExportSnapshot, type ExportImage } from '../notes/export/model.js'
import { checkPixels, layoutExport, EXPORT_LIMITS, type ExportPage } from '../notes/export/layout.js'
import { imageDimensions } from '../notes/export/image.js'
import type { NoteExportRequest, NoteExportFormat } from '../contracts/notes.js'

export type ExportFormat = Exclude<NoteExportFormat, 'snapshot'>
export interface ExportOptions { format: ExportFormat; includeSource: boolean; includeTags?:boolean; includeSummary?:boolean; width: number; pixelRatio: number; background: 'light' | 'dark' | 'transparent'; assetId?: string }
export interface DownloadFile { blob: Blob; filename: string }
interface Frozen { noteId: string; revision: string }
export async function exportRequest(identity: Frozen, body: Omit<NoteExportRequest, keyof Frozen>, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Response> {
  signal.throwIfAborted()
  const response = await fetcher('/dsh-github-notebook/notes/export', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...identity, ...body }), signal })
  signal.throwIfAborted()
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null)
    throw new ApiError(error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[a-z_]{1,60}$/.test(error.code) ? error.code : 'export_failed')
  }
  return response
}
export function downloadFilename(response: Response): string {
  const match = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get('content-disposition') ?? '')
  try { const name = decodeURIComponent(match?.[1] ?? '笔记'); return /[\\/\x00-\x1f]/.test(name) ? '笔记' : name } catch { return '笔记' }
}
type ExportFields = Pick<NoteExportRequest, 'includeSource'|'includeTags'|'includeSummary'>
async function snapshot(identity: Frozen, fields: ExportFields, signal: AbortSignal): Promise<ExportSnapshot> {
  const value = await (await exportRequest(identity, { format: 'snapshot', ...fields }, signal)).json() as ExportSnapshot
  signal.throwIfAborted()
  if (value?.noteId !== identity.noteId || value?.revision !== identity.revision || typeof value.filename !== 'string' || !Array.isArray(value.model?.blocks) || !Array.isArray(value.model?.assetIds) || !value.assets || Object.keys(value.assets).some(id => !value.model.assetIds.includes(id))) throw new ApiError('invalid_response')
  return value
}
async function decodeImage(dataUrl: string, signal: AbortSignal): Promise<HTMLImageElement> {
  if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)) throw new ExportError('export_image_missing')
  imageDimensions(Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), c => c.charCodeAt(0)))
  signal.throwIfAborted(); const image = new Image(); image.src = dataUrl
  try { await image.decode() } catch { throw new ExportError('export_image_decode') }
  signal.throwIfAborted()
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > EXPORT_LIMITS.side || image.naturalHeight > EXPORT_LIMITS.side || image.naturalWidth * image.naturalHeight > EXPORT_LIMITS.imagePixels) throw new ExportError('export_image_budget')
  return image
}
/** Convert animated formats at their first decoded frame, then freeze every render to PNG. */
export async function prepareImages(value: Pick<ExportSnapshot,'model'|'assets'>, signal: AbortSignal): Promise<{ images: Record<string, ExportImage>; convertedImages: Array<{ assetId: string; png: string }> }> {
  const images: Record<string, ExportImage> = {}, convertedImages: Array<{ assetId: string; png: string }> = []
  for (const id of value.model.assetIds) {
    const source = value.assets[id]; if (!source) throw new ExportError('export_image_missing')
    const image = await decodeImage(source, signal)
    let dataUrl = source
    if (/\.(webp|gif)$/.test(id)) {
      // ImageDecoder pins frame 0; <img> animation timing cannot select a deterministic frame.
      const Decoder = (globalThis as unknown as { ImageDecoder?: ImageDecoderConstructor }).ImageDecoder
      if (!Decoder) throw new ExportError('export_image_decode')
      const raw = Uint8Array.from(atob(source.slice(source.indexOf(',') + 1)), c => c.charCodeAt(0))
      const decoder = new Decoder({ data: raw, type: id.endsWith('.gif') ? 'image/gif' : 'image/webp' })
      try {
        const frame = await decoder.decode({ frameIndex: 0 })
        try {
          signal.throwIfAborted()
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
          const context = canvas.getContext('2d'); if (!context) throw new ExportError('export_image_decode')
          context.drawImage(frame.image, 0, 0); dataUrl = canvas.toDataURL('image/png')
          if (!dataUrl.startsWith('data:image/png;base64,')) throw new ExportError('export_image_decode')
          convertedImages.push({ assetId: id, png: dataUrl.slice(dataUrl.indexOf(',') + 1) })
          canvas.width = 0; canvas.height = 0
        } finally { frame.image.close() }
      } finally { decoder.close() }
    }
    images[id] = { dataUrl, width: image.naturalWidth, height: image.naturalHeight }
  }
  return { images, convertedImages }
}
interface ImageDecoderConstructor { new(options: { data: Uint8Array; type: string }): { decode(options: { frameIndex: number }): Promise<{ image: CanvasImageSource & { close(): void } }>; close(): void } }

let fontPromise: Promise<{ css: string }> | undefined
async function loadFont(signal: AbortSignal): Promise<{ css: string }> {
  if (!fontPromise) fontPromise = (async () => {
    const response = await fetch('/dsh-github-notebook/notes/export-font', { credentials: 'same-origin' })
    if (!response.ok) throw new ExportError('export_font')
    const bytes = await response.arrayBuffer(), font = new FontFace('DSHExportNoto', bytes)
    await font.load(); document.fonts.add(font)
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(new Blob([bytes], { type: 'font/otf' })) })
    return { css: `@font-face{font-family:DSHExportNoto;src:url(${dataUrl}) format('opentype');font-weight:100 900;}` }
  })().catch(error => { fontPromise = undefined; throw error })
  const result = await fontPromise; signal.throwIfAborted(); return result
}
function pageElement(page: ExportPage, images: Record<string, ExportImage>, background: ExportOptions['background']): HTMLDivElement {
  const root = document.createElement('div'), dark = background === 'dark'
  Object.assign(root.style, { position: 'relative', width: `${page.width}px`, height: `${page.height}px`, fontFamily: 'DSHExportNoto', fontKerning: 'none', color: dark ? '#f1f4f8' : '#17212b', background: background === 'transparent' ? 'transparent' : dark ? '#17212b' : '#ffffff', overflow: 'hidden' })
  for (const item of page.items) {
    const node = document.createElement(item.type === 'image' ? 'img' : 'div')
    Object.assign(node.style, { position: 'absolute', boxSizing: 'border-box', margin: '0', left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` })
    if (item.type === 'image') { (node as HTMLImageElement).src = images[item.assetId]!.dataUrl; (node as HTMLImageElement).alt = item.alt }
    else if (item.type === 'line') node.style.background = dark ? '#647080' : '#cccccc'
    else {
      Object.assign(node.style, { fontSize: `${item.size}px`, lineHeight: `${item.height}px`, whiteSpace: 'pre', ...(item.shade ? { background: dark ? '#263443' : '#f0f2f5' } : {}), ...(item.quote ? { borderLeft: '2px solid #999', paddingLeft: '2px' } : {}) })
      for (const run of item.runs) { const span = document.createElement('span'); span.textContent = run.text; Object.assign(span.style, { ...(run.href ? { color: dark ? '#8cc4ff' : '#1759a4', textDecoration: 'underline' } : {}), ...(run.strong ? { fontWeight: '600' } : {}), ...(run.emphasis ? { fontStyle: 'italic' } : {}) }); node.append(span) }
    }
    root.append(node)
  }
  return root
}
export async function renderPages(value: Pick<ExportSnapshot,'model'|'filename'>, images: Record<string, ExportImage>, options: Pick<ExportOptions,'width'|'pixelRatio'|'background'|'format'>, signal: AbortSignal): Promise<DownloadFile> {
  const font = await loadFont(signal), canvas = document.createElement('canvas'), context = canvas.getContext('2d')
  if (!context) throw new ExportError('export_failed')
  context.fontKerning = 'none'
  const measures = new Map<string, number>()
  const measure = (text: string, size: number) => { const key = `${size}:${text}`; const known = measures.get(key); if (known !== undefined) return known; context.font = `${size}px DSHExportNoto`; const n = context.measureText(text).width; measures.set(key, n); return n }
  const pages = layoutExport(value.model, images, measure, options.width, options.format === 'png-pages' ? Math.round(options.width * Math.SQRT2) : null)
  for (const page of pages) checkPixels(page.width, page.height, options.pixelRatio)
  const files: Record<string, Uint8Array> = {}, holder = document.createElement('div'); let totalBytes = 0
  Object.assign(holder.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none', zIndex: '-1' }); holder.setAttribute('aria-hidden', 'true'); document.body.append(holder)
  try {
    for (let i = 0; i < pages.length; i++) {
      signal.throwIfAborted(); const page = pages[i]!, node = pageElement(page, images, options.background); holder.replaceChildren(node)
      await Promise.all([...node.querySelectorAll('img')].map(image => image.decode()))
      signal.throwIfAborted()
      const blob = await toBlob(node, { width: page.width, height: page.height, pixelRatio: options.pixelRatio, skipAutoScale: true, fontEmbedCSS: font.css, includeQueryParams: true, cacheBust: false })
      signal.throwIfAborted(); if (!blob || blob.size < 32) throw new ExportError('export_failed')
      if ((totalBytes += blob.size) > 128 * 1024 * 1024) throw new ExportError('export_output_limit')
      const bitmap = await createImageBitmap(blob)
      try { if (bitmap.width !== Math.floor(page.width * options.pixelRatio) || bitmap.height !== Math.floor(page.height * options.pixelRatio)) throw new ExportError('export_dimensions') } finally { bitmap.close() }
      if (options.format === 'png-long') return { blob, filename: `${value.filename}-长图.png` }
      files[`${String(i + 1).padStart(3, '0')}.png`] = new Uint8Array(await blob.arrayBuffer())
    }
    signal.throwIfAborted(); return { blob: new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), filename: `${value.filename}-分页图片.zip` }
  } finally { holder.remove(); canvas.width = 0 }
}
export async function createNoteDownload(identity: Frozen, options: ExportOptions, signal: AbortSignal): Promise<DownloadFile> {
  if (options.width < 480 || options.width > 2160 || !Number.isInteger(options.width) || ![1,2].includes(options.pixelRatio)) throw new ExportError('export_dimensions')
  const {includeSource,includeTags,includeSummary}=options
  const fields:ExportFields={includeSource,...(includeTags!==undefined&&{includeTags}),...(includeSummary!==undefined&&{includeSummary})}
  if (options.format === 'pdf' || options.format.startsWith('png-')) {
    const value = await snapshot(identity, fields, signal), prepared = await prepareImages(value, signal)
    if (options.format !== 'pdf') return renderPages(value, prepared.images, options, signal)
    if (prepared.convertedImages.reduce((n, image) => n + Math.ceil(image.png.length * 3 / 4), 0) > 1024 * 1024) throw new ExportError('export_conversion_budget')
    const response = await exportRequest(identity, { format: 'pdf', ...fields, convertedImages: prepared.convertedImages }, signal)
    const blob = await response.blob(); signal.throwIfAborted(); return { blob, filename: downloadFilename(response) }
  }
  const response = await exportRequest(identity, { format: options.format, ...fields, ...(options.assetId ? { assetId: options.assetId } : {}) }, signal)
  const blob = await response.blob(); signal.throwIfAborted(); return { blob, filename: downloadFilename(response) }
}
/** Browser/Electron own the final save; a click means download started, never disk-save verified. */
export function startNoteDownload(file: DownloadFile): void {
  const url = URL.createObjectURL(file.blob), a = document.createElement('a'); a.href = url; a.download = file.filename; a.style.display = 'none'; document.body.append(a)
  try { a.click() } finally { a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000) }
}
