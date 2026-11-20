import type { TagChange, TagPhase, TagRequest } from '../contracts/tag-management.js'
import type { NoteRevision } from '../contracts/notes.js'
import { revisionContent } from './conflicts.js'
import { createNoteRevision } from './revisions.js'
import { NoteFiles, missing, utf8 } from './files.js'
import { canonical, digest, fail, hash, keys, object, text } from './validation.js'

export interface TagRow {
  noteId: string; before: string; after: string; notebookId: string | null; title: string; undo?: string
}
export interface TagJournal extends TagChange {
  token: string; phase: TagPhase; at: string; undoAt?: string; rows: TagRow[]
}
export function parseTagRequest(raw: unknown): TagRequest {
  const v=object(raw)
  if(v.action==='status'){keys(v,['action']);return {action:'status'}}
  if(v.action==='resume'||v.action==='finish'){
    keys(v,['action','token']);return {action:v.action,token:hash(v.token)}
  }
  if(v.action!=='apply'&&v.action!=='preview')return fail('note_schema')
  keys(v,['action','source','target','mode',...(v.action==='apply'?['token']:[])])
  const source=text(v.source,200).trim(),target=v.target===null?null:text(v.target,200).trim()
  if(!source||source===target||!(v.mode==='merge'||v.mode==='rename'||v.mode==='remove')||
     (v.mode==='remove'?target!==null:!target))return fail('note_schema')
  const change={source,target,mode:v.mode} as TagChange
  return v.action==='preview'?{action:'preview',...change}:{action:'apply',...change,token:hash(v.token)}
}
export function tagRevision(base: NoteRevision, tags: string[], notebookId: string|null, recordedAt: string) {
  return createNoteRevision({...revisionContent(base),tags,notebookId,version:1,noteId:base.noteId,parents:[base.revision],recordedAt})
}
export function replaceTag(tags: string[], source: string, target: string | null) {
  return [...new Set([...tags.filter(tag=>tag!==source),...(target?[target]:[])])].sort()
}
// One local receipt beside the notes directory. Only ordinary note revisions travel with sync.
export async function readTagJournal(files: NoteFiles): Promise<TagJournal|null> {
  const bytes=await files.read('manifest.json',64*1024*1024).catch(e=>{if(missing(e))return null;throw e})
  if(!bytes)return null
  const {job,checksum}=object(JSON.parse(utf8(bytes)))
  if(!job||checksum!==digest(canonical(job)))return fail('note_corrupt')
  return job as TagJournal
}
export async function writeTagJournal(files: NoteFiles, job: TagJournal) {
  await files.write('manifest.json',canonical({job,checksum:digest(canonical(job))}),false)
}

