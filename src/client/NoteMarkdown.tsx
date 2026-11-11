import {CopyCode,codeText} from './paper/CopyCode.js'
import {translate,type T} from './locale.js'
import * as React from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NoteView } from '../contracts/notes.js'
import { safePublicUrl } from './safe-url.js'
import {noteLinkId,attachmentLinkId} from '../contracts/note-links.js'
import {attachmentUrl} from './NoteAttachments.js'
import {highlightMarkdown} from './search-highlight.js'
import {Highlight} from './SearchText.js'

export function noteAssetUrl(note: NoteView, assetId: string, sourceId?: string): string {
  const query = new URLSearchParams({ noteId: note.noteId, revision: note.current.revision, assetId, ...(sourceId ? { sourceId } : {}) })
  return `/dsh-fatfish-notes/notes/asset?${query}`
}
export function resolveNoteImage(url: string, note: NoteView): string | null {
  const match = /^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|webp|gif))$/.exec(url)
  return match?.[1] && note.current.assetIds.includes(match[1]) ? noteAssetUrl(note, match[1]) : null
}
const components: Components = {
  ...Object.fromEntries((['p','h1','h2','h3','h4','h5','h6','li','blockquote','table'] as const).map(tag=>[tag,({node,children}:{node?:{position?:{start:{offset?:number}}};children?:React.ReactNode})=>React.createElement(tag,{'data-md-pos':node?.position?.start.offset},children)])),
  a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
  img: ({ src, alt }) => src ? <img src={src} alt={alt ?? ''} loading="lazy" style={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain' }} /> : <span role="img" aria-label={alt ?? ''}>[{alt || 'Image'}]</span>,

}
/** Never fetch an arbitrary Markdown image, even when it is host-relative. */
export const NoteMarkdown = React.memo(function NoteMarkdown({ body, note,onNoteLink,query='',t=translate }: { body: string; note: NoteView;onNoteLink?:(id:string)=>void;query?:string|undefined;t?:T }) {
  return <div className="note-markdown" style={{ lineHeight: 1.8, overflowWrap: 'anywhere' }}><Markdown skipHtml remarkPlugins={[remarkGfm,highlightMarkdown(query)]} components={{...components,pre:({node,children})=><div className="paper-code" data-md-pos={node?.position?.start.offset}><CopyCode value={codeText(node)} t={t}/><pre>{children}</pre></div>,code:({className,children})=><code className={className}>{typeof children==='string'?<Highlight value={children} query={query}/>:children}</code>,a:({href,children})=>{
    const id=noteLinkId(href??''),file=attachmentLinkId(href??'')
    if(id)return <a href={href} onClick={e=>{e.preventDefault();onNoteLink?.(id)}}>{children}</a>
    if(file&&note.current.attachments?.some(a=>a.id===file))return <a href={attachmentUrl(note,file)} download>{children}</a>
    return href?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>
  }}} urlTransform={(url, key) => key === 'src' ? resolveNoteImage(url, note) ?? '' : noteLinkId(url)||attachmentLinkId(url)?url:safePublicUrl(url) ?? ''}>{body}</Markdown></div>
})
