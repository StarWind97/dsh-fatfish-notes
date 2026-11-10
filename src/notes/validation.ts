import { createHash } from 'node:crypto'
import { NotebookError } from '../domain/errors.js'
import type { NoteContent, NoteAttachment } from './types.js'
import { ATTACHMENT_LIMIT } from '../contracts/notes.js'
import { NOTE_LIMITS } from './types.js'

export function fail(code = 'invalid_note', message = '笔记数据无效，原内容已保留'): never { throw new NotebookError(code, message) }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail()
  return value as Record<string, unknown>
}
export function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(value, key))) fail('note_schema', '笔记字段缺失或版本不支持')
}
export function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || /[\uD800-\uDFFF]/u.test(value) || Buffer.byteLength(value, 'utf8') > max) fail('note_limit', '笔记字段格式无效或超过 UTF-8 大小上限')
  return value
}
export function id(value: unknown): string { if (typeof value !== 'string' || !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(value)) fail('note_id'); return value }
export function hash(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail('note_hash'); return value }
export function assetId(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}\.(png|jpg|webp|gif)$/.test(value)) fail('note_asset'); return value }
export function sortedStrings(value: unknown, max: number, check: (v: unknown) => string): string[] {
  if (!Array.isArray(value) || value.length > max) fail('note_limit')
  return [...new Set(value.map(check))].sort()
}
export function date(value: unknown): string {
  const result = text(value, 32)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result) fail('note_date')
  return result
}
export function status(value: unknown): 'active' | 'trashed' { if (value !== 'active' && value !== 'trashed') fail(); return value }
export const contentKeys = ['title', 'body', 'summary', 'tags', 'notebookId', 'status', 'sourceId', 'assetIds'] as const
export const optionalContentKeys = ['attachments', 'originPath', 'favorite', 'isTemplate'] as const
export function contentFields(v: Record<string, unknown>): string[] { return [...contentKeys, ...optionalContentKeys.filter(k => Object.hasOwn(v, k))] }
export function attachment(value: unknown): NoteAttachment {
  const v = object(value); keys(v, ['id', 'name', 'bytes'])
  const name = text(v.name, 1000).normalize('NFC').replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim()
  if (!name || name === '.' || name === '..' || !Number.isSafeInteger(v.bytes) || Number(v.bytes) < 0 || Number(v.bytes) > ATTACHMENT_LIMIT) fail('attachment_limit', '附件名称无效或超过 50 MiB')
  return { id: hash(v.id), name, bytes: Number(v.bytes) }
}
export function normalizeContent(value: unknown): NoteContent {
  const v = object(value); keys(v, contentFields(v))
  for (const key of ['favorite','isTemplate']) if (v[key] !== undefined && typeof v[key] !== 'boolean') fail('note_schema')
  let attachments: NoteAttachment[] | undefined
  if (v.attachments !== undefined) {
    if (!Array.isArray(v.attachments) || v.attachments.length > 128) fail('attachment_limit')
    attachments = v.attachments.map(attachment)
    if (new Set(attachments.map(a => a.id)).size !== attachments.length || attachments.reduce((n,a) => n+a.bytes, 0) > 200*1024*1024) fail('attachment_limit', '单篇附件总量不能超过 200 MiB')
  }
  return {
    title: text(v.title, 1200).trim() || '无标题', body: text(v.body, NOTE_LIMITS.body),
    summary: text(v.summary, 12_000).trim(), tags: sortedStrings(v.tags, 50, v => { const s = text(v, 200).trim(); if (!s) fail(); return s }),
    notebookId: v.notebookId === null ? null : id(v.notebookId), status: status(v.status),
    sourceId: v.sourceId === null ? null : hash(v.sourceId), assetIds: sortedStrings(v.assetIds, NOTE_LIMITS.images, assetId),
    ...(attachments ? { attachments } : {}), ...(v.originPath !== undefined ? { originPath: text(v.originPath, 4096) } : {}),
    ...(v.favorite !== undefined ? {favorite:v.favorite as boolean} : {}), ...(v.isTemplate !== undefined ? {isTemplate:v.isTemplate as boolean} : {}),
  }
}
/** Lexicographic object keys; array order is significant. No body normalization. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') { if (/[\uD800-\uDFFF]/u.test(value)) fail(); return JSON.stringify(value) }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  // Array.from visits holes as undefined; canonical then rejects them before I/O.
  if (Array.isArray(value)) return `[${Array.from(value, canonical).join(',')}]`
  const v = object(value)
  return `{${Object.keys(v).sort().map(key => `${JSON.stringify(key)}:${canonical(v[key])}`).join(',')}}`
}
export function digest(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex') }
export function relativePath(value: string): string {
  if (typeof value !== 'string' || !/^(?:documents\/[0-7][0-9A-HJKMNP-TV-Z]{25}\.md|deleted\/[0-7][0-9A-HJKMNP-TV-Z]{25}\.json|(?:revisions|notebooks)\/[0-7][0-9A-HJKMNP-TV-Z]{25}\/[a-f0-9]{64}\.json|(?:sources|captures|jobs)\/[a-f0-9]{64}\.json|(?:quarantine|attachments)\/[a-f0-9]{64}\.bin|assets\/[a-f0-9]{64}\.(?:png|jpg|webp|gif)|manifest\.json)$/.test(value)) fail('note_path', '笔记路径不安全')
  return value
}
