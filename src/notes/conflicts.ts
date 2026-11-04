import { ulid } from '../domain/id.js'
import { canonical, digest } from './validation.js'
import type { NoteContent,NoteRevision } from './types.js'
import { createNoteRevision,materializeNote } from './revisions.js'

export function revisionContent(row:NoteRevision):NoteContent {
  const {version,noteId,revision,parents,recordedAt,...content}=row
  return content
}

export function conflictForkId(row:NoteRevision):string {
  return ulid(0,()=>Buffer.from(digest(row.revision),'hex'))
}
function conflictTitle(value:string,label:'A'|'B'):string {
  const suffix='（冲突版本 '+label+'）'
  const chars=Array.from(value)
  while(Buffer.byteLength(chars.join('')+suffix)>1200)chars.pop()
  return chars.join('')+suffix
}

// A merge only represents one of its real source revisions on the original note.
// Recover that identity before merging overlapping sets of offline changes.
function conflictOrigin(row:NoteRevision,history:Map<string,NoteRevision>,cache:Map<string,NoteRevision>):NoteRevision {
  if(row.parents.length<2)return row
  const cached=cache.get(row.revision)
  if(cached)return cached
  const content=canonical(revisionContent(row))
  for(const parent of row.parents){
    const revision=history.get(parent)
    if(!revision)continue
    const source=conflictOrigin(revision,history,cache)
    const original=revisionContent(source)
    if(content===canonical(original)||content===canonical({...original,title:conflictTitle(original.title,'A')})){
      cache.set(row.revision,source);return source
    }
  }
  cache.set(row.revision,row);return row
}

export function conflictRevisions(revisions: NoteRevision[]): NoteRevision[] {
    const output:NoteRevision[]=[]
    const history=new Map(revisions.map(row=>[row.revision,row])),cache=new Map<string,NoteRevision>()
    for (const noteId of new Set(revisions.map(row=>row.noteId))) {
      const view=materializeNote(revisions.filter(row=>row.noteId===noteId),noteId)
      if(!view.conflicts.length)continue
      const heads=[view.current,...view.conflicts]
      const at=heads.map(row=>row.recordedAt).sort().at(-1)!
      const sources=heads.map(row=>conflictOrigin(row,history,cache)).sort((a,b)=>a.revision.localeCompare(b.revision,'en'))
      const ancestors=new Set<string>()
      const pending=sources.flatMap(row=>row.parents)
      while(pending.length){
        const parent=pending.pop()!
        if(ancestors.has(parent))continue
        ancestors.add(parent);pending.push(...(history.get(parent)?.parents??[]))
      }
      const leaves=sources.filter(row=>!ancestors.has(row.revision))
      const unique=leaves.filter((row,i)=>leaves.findIndex(other=>canonical(revisionContent(row))===canonical(revisionContent(other)))===i)
      // Each losing source always has the same independent root and identity.
      for(const row of unique.slice(1)){
        const forkId=conflictForkId(row)
        const fork=createNoteRevision({...revisionContent(row),version:1,noteId:forkId,recordedAt:row.recordedAt,parents:[],title:conflictTitle(row.title,'B')})
        if(!history.has(fork.revision))output.push(fork)
      }
      const first=unique[0]!
      const labelled=unique.length>1||heads.some(row=>row.title!==first.title)
      output.push(createNoteRevision({...revisionContent(first),version:1,noteId,parents:view.heads,recordedAt:at,title:labelled?conflictTitle(first.title,'A'):first.title}))
    }
    return output
}
