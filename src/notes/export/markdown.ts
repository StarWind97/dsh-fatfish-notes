import {materialMarkdown,capturedFile} from '../capture-materials.js'
import type { NoteRevision, CaptureSource } from '../../contracts/notes.js'
import type { Root, RootContent, PhrasingContent } from 'mdast'
import { exportTree, ExportError } from './model.js'

export function exportFilename(title: string): string {
  const clean = title.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, '_')
  const shortened = Array.from(clean, c => c.length === 1 && /[\ud800-\udfff]/.test(c) ? '_' : c).slice(0, 80).join('').replace(/[. ]+$/g, '')
  return (shortened || '笔记').replace(/^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\.|$)/i, '_$1$2')
}
export function sourceMarkdown(source: Record<string, unknown>): { body: string; assets: string[] } {
  const v = source as unknown as CaptureSource
  if (v.version !== 1 || !Array.isArray(v.messages) || !v.assets || typeof v.assets !== 'object') throw new ExportError('export_source')
  const chunks = ['\n\n---\n\n# 原始素材\n'], assets = new Set<string>()
  const inline=new Set<string>()
  for (const message of v.messages) {
    if (!['user','assistant'].includes(message.role) || !Array.isArray(message.blocks)) throw new ExportError('export_source')
    chunks.push(`\n## ${message.role === 'user' ? '用户' : 'AI'}\n`)
    for (const block of message.blocks) {
      const file=capturedFile(block,message,v.archivedMaterials)
      if(file){chunks.push('\n'+file.markdown+'\n');if(file.material)inline.add(file.material.id);continue}
      if (block.type === 'text' && typeof block.text === 'string') {
        const fence = '`'.repeat(Math.max(3, ...[...block.text.matchAll(/`+/g)].map(m => m[0].length + 1)))
        chunks.push(`\n${fence}text\n${block.text}\n${fence}\n`)
      } else if (block.type === 'image') {
        const asset = v.assets[block.attachmentId]
        if (!asset) { chunks.push('\n[图片未包含]\n'); continue }
        if (!/^[a-f0-9]{64}\.(png|jpg|webp|gif)$/.test(asset)) throw new ExportError('export_image_missing')
        assets.add(asset); chunks.push(`\n![原始图片](../assets/${asset})\n`)
      } else throw new ExportError('export_source')
    }
  }
  for(const m of v.archivedMaterials??[])if(m.assetId)assets.add(m.assetId)
  chunks.push(materialMarkdown(v.archivedMaterials?.filter(m=>(!m.imageId||!!m.saved)&&!inline.has(m.id))??[]))
  return { body: chunks.join(''), assets: [...assets] }
}
const escapePunctuation = (value: string): string => value.replace(/[\u0021-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e]/g, '\\$&')
/** Keep raw reference-label spelling: identifier matching does not decode entity/escape spellings. */
export function definitionLabel(raw: string): string {
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] === '\\') { i++; continue }
    if (raw[i] === ']' && raw[i + 1] === ':') return raw.slice(0, i + 2)
  }
  throw new ExportError('export_markdown')
}
export function rewriteMarkdown(body: string, closeAtEnd = false): string {
  const tree = exportTree(body), changes: Array<{ start: number; end: number; text: string }> = []
  // Only a root-level unfinished fence can continue across a new unindented block.
  // Preserve every original body byte; append its missing delimiter only for an appendix.
  const tail = tree.children.at(-1), rawTail = tail?.type === 'code' ? body.slice(tail.position?.start.offset ?? body.length, tail.position?.end.offset) : ''
  const opening = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(rawTail)?.[1], lines = rawTail.trimEnd().split(/\r?\n/), closing = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/.exec(lines.at(-1) ?? '')?.[1]
  const unfinished = opening && !(lines.length > 1 && closing && closing[0] === opening[0] && closing.length >= opening.length)
  const visit = (node: Root | RootContent | PhrasingContent) => {
    const start = node.position?.start.offset, end = node.position?.end.offset
    if (start !== undefined && end !== undefined) {
      if ((node.type === 'image' || node.type === 'definition') && node.url.startsWith('../assets/')) {
        const url = node.url.slice(3), title = node.title === null || node.title === undefined ? '' : ` "${escapePunctuation(node.title)}"`
        // Serialize the authorized AST destination, not a possibly identical alt/title substring.
        const text = node.type === 'image' ? `![${escapePunctuation(node.alt ?? '')}](${url}${title})` : `${definitionLabel(body.slice(start, end))} ${url}${title}`
        changes.push({ start, end, text })
      }
      if (node.type === 'html') changes.push({ start, end, text: (node.value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') })
    }
    if ('children' in node) for (const child of node.children) visit(child)
  }
  visit(tree)
  for (const change of changes.sort((a, b) => b.start - a.start)) body = body.slice(0, change.start) + change.text + body.slice(change.end)
  return body + (closeAtEnd && unfinished ? `${body.endsWith('\n') ? '' : '\n'}${opening}\n` : '')
}
/** Public metadata only. Note and opt-in source are separate parse units. */
export function exportMarkdown(header: Pick<NoteRevision,'title'|'tags'|'summary'> & {modified:string}, body:string, appendix?:string):string {
  body = rewriteMarkdown(body, appendix !== undefined) + (appendix === undefined ? '' : '\n\n' + rewriteMarkdown(appendix))
  const {title,modified,tags,summary} = header
  const fields = ['---', 'title: ' + JSON.stringify(title), 'updated: ' + JSON.stringify(modified)]
  if (tags.length) fields.push('tags: ' + JSON.stringify(tags))
  if (summary) fields.push('summary: ' + JSON.stringify(summary))
  fields.push('---')
  const inline = (value:string)=>escapePunctuation(value.replace(/[\r\n]+/g,' '))
  const sections = [fields.join('\n'), '# ' + inline(title || '未命名笔记'), modified]
  if (tags.length) sections.push(tags.map(tag=>'#'+inline(tag)).join(' · '))
  if (summary) sections.push(summary.split(/\r\n?|\n/).map(line=>'> '+escapePunctuation(line)).join('\n'), '---')
  sections.push(body)
  return sections.join('\n\n') + '\n'
}
