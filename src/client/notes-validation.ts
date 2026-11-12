import type { ApiPath } from '../contracts/api.js'
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const id = (v: unknown) => typeof v === 'string' && /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(v)
const attachment=(v:unknown)=>record(v)&&hash(v.id)&&typeof v.name==='string'&&Number.isSafeInteger(v.bytes)&&Number(v.bytes)>=0&&Number(v.bytes)<=100*1024*1024
function cut(v: unknown): boolean { return record(v) && Number.isSafeInteger(v.throughSeq) && Number(v.throughSeq) >= -1 && typeof v.capturedAt === 'string' && Number.isFinite(Date.parse(v.capturedAt)) && typeof v.isSeeded === 'boolean' }
function note(v: unknown): boolean {
  if (!record(v) || !id(v.noteId) || !strings(v.heads) || !v.heads.length || !v.heads.every(hash) || !record(v.current) || !Array.isArray(v.conflicts) || typeof v.savedAt !== 'string') return false
  const heads = v.heads
  const revision = (r: unknown) => record(r) && r.version === 1 && r.noteId === v.noteId && hash(r.revision) && heads.includes(String(r.revision)) && ['title','body','summary','recordedAt'].every(k => typeof r[k] === 'string') && strings(r.tags) && strings(r.assetIds) && strings(r.parents) && ['active','trashed'].includes(String(r.status)) && (r.sourceId === null || hash(r.sourceId)) && (r.notebookId === null || id(r.notebookId)) && (r.attachments===undefined||Array.isArray(r.attachments)&&r.attachments.every(attachment)) && (r.sessionLinks===undefined||strings(r.sessionLinks)&&r.sessionLinks.length<=1000) && (r.originPath===undefined||typeof r.originPath==='string')
  return revision(v.current) && v.conflicts.every(revision) && (v.effectiveNotebookId === null || id(v.effectiveNotebookId))
}
export function validCaptureSource(value: unknown): boolean {
  return record(value) && value.version === 1 && typeof value.complete === 'boolean' && Array.isArray(value.messages) && value.messages.every(m => record(m) && typeof m.id === 'string' && ['user','assistant'].includes(String(m.role)) && Array.isArray(m.blocks) && m.blocks.every(b => record(b) && (b.type === 'text' ? typeof b.text === 'string' : b.type === 'image' && typeof b.attachmentId === 'string'))) && record(value.assets) && Object.values(value.assets).every(v => typeof v === 'string' && /^[a-f0-9]{64}\.(png|jpg|gif|webp)$/.test(v))
}
export function validNotesResponse(path: ApiPath, value: unknown): boolean | undefined {
  if (path !== '/notes' && !path.startsWith('/notes/')) return undefined
  if (!record(value) || value.ok !== true) return false
  if(path==='/notes/draft')return ['editing','finished','discarded'].includes(String(value.state))&&(value.note===null||note(value.note))
  if(path==='/notes/draft-recovery')return Array.isArray(value.recovered)&&value.recovered.every(id)&&strings(value.failed)
  if(path==='/notes/capture-progress'){const p=value.progress;return p===null||record(p)&&typeof p.file==='string'&&['bytes','total','done','count'].every(k=>Number.isSafeInteger(p[k])&&Number(p[k])>=0)&&['reading','saving','complete'].includes(String(p.stage))}
  if(path==='/notes/usage'){const u=value.usage;return record(u)&&['bytes','gitBytes','notes','revisions'].every(k=>Number.isSafeInteger(u[k])&&Number(u[k])>=0)&&['normal','notice','large'].includes(String(u.level))&&typeof u.nearLimit==='boolean'}
  if(path==='/notes/reference')return typeof value.instruction==='string'&&Number.isSafeInteger(value.files)
  if(path==='/notes/import-task')return value.taskId===undefined||typeof value.taskId==='string'
  if(path==='/notes/transfer')return (value.uploadId===undefined||typeof value.uploadId==='string')&&(value.offset===undefined||Number.isSafeInteger(value.offset))&&(value.attachment===undefined||attachment(value.attachment))&&(value.asset===undefined||record(value.asset)&&typeof value.asset.id==='string')
  if(path==='/notes/associate')return note(value.note)
  if(path==='/notes/suggest'){const m=value.metadata;return record(m)&&typeof m.title==='string'&&!!m.title.trim()&&[...m.title].length<=60&&typeof m.summary==='string'&&[...m.summary].length<=200&&!/[\r\n]/.test(m.summary)&&strings(m.tags)&&m.tags.length<=5}
  if(path==='/notes/session-context')return (value.workspace===null||record(value.workspace)&&typeof value.workspace.id==='string'&&typeof value.workspace.title==='string')&&(value.notebookId===null||id(value.notebookId))
  if(path==='/notes/workspace-book')return value.notebookId===null||id(value.notebookId)
  if (path === '/notes/attachment') return attachment(value.attachment)
  if (path === '/notes/batch') return strings(value.completed) && value.completed.every(id)
  if (path === '/notes/manage') return strings(value.completed)&&value.completed.every(id)&&(value.note===undefined||note(value.note))
  if (path === '/notes/catalog') return Array.isArray(value.tags)&&value.tags.every(v=>record(v)&&typeof v.tag==='string'&&Number.isSafeInteger(v.count)&&Number(v.count)>0)
  if (path === '/notes/history') return Array.isArray(value.items)&&value.items.length<=30&&value.items.every(v=>record(v)&&hash(v.revision)&&typeof v.recordedAt==='string'&&typeof v.title==='string'&&typeof v.summary==='string'&&['active','trashed'].includes(String(v.status)))&&(value.cursor===null||hash(value.cursor))
  if (path === '/notes/backlinks') return validNotesResponse('/notes',{...value,cursor:null})
  if (path === '/notes/revision') return note(value.note)
  if (path === '/notes/image') return record(value.asset) && typeof value.asset.id === 'string' && /^[a-f0-9]{64}\.(?:png|jpg|gif|webp)$/.test(value.asset.id) && Number.isSafeInteger(value.asset.bytes) && Number(value.asset.bytes)>0 && (value.asset.preview===undefined || typeof value.asset.preview==='string' && /^data:image\/(?:png|jpeg|webp|gif);base64,/.test(value.asset.preview))
  if (['/notes/get','/notes/save','/notes/trash','/notes/restore','/notes/resolve'].includes(path)) return note(value.note)
  if (path === '/notes') return Array.isArray(value.items) && value.items.length <= 100 && value.items.every(v => record(v) && id(v.noteId) && strings(v.heads) && v.heads.every(hash) && typeof v.title === 'string' && typeof v.summary === 'string' && strings(v.tags) && (v.notebookId === null || id(v.notebookId)) && ['active','trashed'].includes(String(v.status)) && typeof v.savedAt === 'string' && typeof v.conflicted === 'boolean' && (v.sessionRelation===undefined || v.sessionRelation===null || ['source','manual'].includes(String(v.sessionRelation)))) && (value.cursor === null || id(value.cursor))
  if (path === '/notes/notebooks' || path === '/notes/notebook') return Array.isArray(value.notebooks) && value.notebooks.every(v => record(v) && id(v.notebookId) && strings(v.heads) && v.heads.every(hash) && record(v.current) && v.current.notebookId === v.notebookId && typeof v.current.title === 'string' && ['active','trashed'].includes(String(v.current.status)) && Array.isArray(v.conflicts) && typeof v.isDefault === 'boolean' && Number.isSafeInteger(v.noteCount) && Number(v.noteCount) >= 0)
  if (path === '/notes/jobs') return Array.isArray(value.jobs) && value.jobs.length <= 5 && value.jobs.every(v => record(v) && hash(v.jobId) && id(v.noteId) && ['running','failed','cancelled','candidate','completed'].includes(String(v.status)) && (v.error === null || typeof v.error === 'string') && Array.isArray(v.stages) && v.stages.length <= 33 && v.stages.every(s => record(s) && ['ready','waiting','done','failed'].includes(String(s.status))) && (v.candidate === null || record(v.candidate) && v.candidate.noteId === v.noteId && typeof v.candidate.title === 'string' && typeof v.candidate.summary === 'string' && strings(v.candidate.tags))) && (value.cursor === null || hash(value.cursor))
  if (['/notes/job','/notes/job/retry','/notes/job/cancel','/notes/candidate'].includes(path)) return job(value.job)
  if (path === '/notes/source') return record(value.source)
  if (path === '/notes/capture') return note(value.note) && hash(value.sourceId) && record(value.note) && record(value.note.current) && value.note.current.sourceId === value.sourceId && typeof value.complete === 'boolean' && Number.isSafeInteger(value.messageCount) && Number(value.messageCount) >= 0 && Number(value.messageCount) <= 20_000 && strings(value.missingAssetIds) && strings(value.issues) && (!value.complete || !value.missingAssetIds.length && !value.issues.length) && (value.enrichmentStatus === 'queued' ? hash(value.enrichmentJobId) : value.enrichmentJobId === null && ['not-requested','unavailable'].includes(String(value.enrichmentStatus))) && cut(value.cut)
  if (path === '/notes/selection') {
    if (!cut(value.cut) || typeof value.complete !== 'boolean' || !strings(value.issues) || !strings(value.defaultMessageIds) || !Array.isArray(value.messages) || value.messages.length > 20_000) return false
    if(value.materials!==undefined&&(!Array.isArray(value.materials)||value.materials.some(m=>!record(m)||typeof m.id!=='string'||!['image','file'].includes(String(m.kind))||typeof m.name!=='string'||typeof m.available!=='boolean'||m.bytes!==null&&(!Number.isSafeInteger(m.bytes)||Number(m.bytes)<0))))return false
    const ids = new Set<string>()
    for (const m of value.messages) {
      if (!record(m) || typeof m.id !== 'string' || ids.has(m.id) || !Number.isSafeInteger(m.seq) || !['user','assistant'].includes(String(m.role)) || !Array.isArray(m.blocks)) return false
      ids.add(m.id)
      if (!m.blocks.every(b => record(b) && (b.type === 'text' ? typeof b.text === 'string' : b.type === 'image' && typeof b.attachmentId === 'string' && typeof b.mediaType === 'string'))) return false
    }
    return value.defaultMessageIds.every(messageId => ids.has(messageId))
  }
  return false
}
function job(v: unknown): boolean {
  if (!record(v) || v.version !== 1 || !hash(v.jobId) || !id(v.noteId) || !hash(v.sourceId) || !hash(v.baseRevision) || v.mode !== 'metadata' || typeof v.autoMetadata !== 'boolean' || !['running','failed','cancelled','candidate','completed'].includes(String(v.status)) || !(v.error === null || typeof v.error === 'string') || !Array.isArray(v.stages) || v.stages.length > 33) return false
  return v.stages.every(s => record(s) && ['ready','waiting','done','failed'].includes(String(s.status)) && ['chunk','final'].includes(String(s.kind)) && typeof s.requestId === 'string' && Number.isSafeInteger(s.attempt) && Number(s.attempt) > 0) && (v.candidate === null || record(v.candidate) && v.candidate.noteId === v.noteId && v.candidate.sourceId === v.sourceId && v.candidate.baseRevision === v.baseRevision && ['title','summary'].every(k => typeof (v.candidate as Record<string, unknown>)[k] === 'string') && strings(v.candidate.tags))
}
