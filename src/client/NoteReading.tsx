import * as React from 'react'
import {LockKeyhole} from 'lucide-react'
import type {NoteContent,NoteView} from '../contracts/notes.js'
import {noteDateTime} from '../notes/date.js'
import {Highlight} from './SearchText.js'
import {NoteMarkdown} from './NoteMarkdown.js'
import {Supplements} from './NoteAttachments.js'
import type {T} from './locale.js'

/** The live reader and exported image share these elements and their paper styles. */
export function ReadingTitle({title,t,query=''}:{title:string;t:T;query?:string|undefined}){
  return <h1><Highlight value={title||t('notesUntitled')} query={query}/></h1>
}
export function ReadingMeta({content,savedAt,t,allTags=false,toggleTags,onTagClick,tag}:{content:NoteContent;savedAt?:string|undefined;t:T;allTags?:boolean;toggleTags?:()=>void;onTagClick?:(tag:string)=>void;tag?:string|undefined}){
  return <div className="paper-meta"><span className="paper-stamp"><LockKeyhole size={13}/>{t('paperPrivate')}{savedAt&&<time dateTime={savedAt} title={t('noteModifiedAt')}>{noteDateTime(savedAt)}</time>}</span>
    {!!content.tags.length&&<div className="paper-tags">{(allTags?content.tags:content.tags.slice(0,3)).map(value=><button key={value} aria-pressed={tag===value} onClick={()=>onTagClick?.(value)}>#{value}</button>)}{content.tags.length>3&&<button aria-expanded={allTags} onClick={toggleTags}>{allTags?'−':'+'+(content.tags.length-3)}</button>}</div>}
  </div>
}
export function ReadingSummary({summary,t,query=''}:{summary:string;t:T;query?:string|undefined}){
  return summary?<section className="paper-summary" aria-label={t('notesSummary')}><label><span>{t('notesSummary')}</span><p><Highlight value={summary} query={query}/></p></label></section>:null
}
export function ReadingBody({note,t,...options}:Omit<React.ComponentProps<typeof NoteMarkdown>,'body'|'t'> & {t:T}){
  return <><NoteMarkdown {...options} body={note.current.body} note={note} t={t}/><Supplements content={note.current} note={note} t={t} staticView={options.staticView}/></>
}
