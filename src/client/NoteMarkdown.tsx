import {Paperclip} from 'lucide-react'
import {codeText} from './paper/CopyCode.js'
import {CodeBlock} from './paper/CodeBlock.js'
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
import {ImageActions,imageActionsCss} from './paper/ImageActions.js'
import {imagePresentations,presentationAvailable,type ImagePresentation} from './paper/image-presentation.js'
import {useStyleSheet} from './styles/inject.js'

export function noteAssetUrl(note: NoteView, assetId: string, sourceId?: string): string {
  const query = new URLSearchParams({ noteId: note.noteId, revision: note.current.revision, assetId, ...(sourceId ? { sourceId } : {}) })
  return `/dsh-fatfish-notes/notes/asset?${query}`
}
export function resolveNoteImage(url: string, note: NoteView): string | null {
  const match = /^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|webp|gif))$/.exec(url)
  return match?.[1] && note.current.assetIds.includes(match[1]) ? noteAssetUrl(note, match[1]) : null
}
const components: Components = {
  ...Object.fromEntries((['p','h1','h2','h3','h4','h5','h6','li','blockquote'] as const).map(tag=>[tag,({node,children}:{node?:{position?:{start:{offset?:number}}};children?:React.ReactNode})=>React.createElement(tag,{'data-md-pos':node?.position?.start.offset},children)])),
  table:({node,children})=><div className="paper-table-wrap" data-md-pos={node?.position?.start.offset}><table>{children}</table></div>,
}
/** Never fetch an arbitrary Markdown image, even when it is host-relative. */
export const NoteMarkdown = React.memo(function NoteMarkdown({ body, note,onNoteLink,onPresentation,query='',t=translate,staticView=false,assetUrl }: { body: string; note: NoteView;onNoteLink?:(id:string)=>void;onPresentation?:(item:ImagePresentation)=>void;query?:string|undefined;t?:T;staticView?:boolean|undefined;assetUrl?:(id:string)=>string }) {
  useStyleSheet('image-actions', imageActionsCss, 'components')
  const imageUrl=(url:string)=>{const resolved=resolveNoteImage(url,note);return resolved&&assetUrl?assetUrl(url.slice(10)):resolved}
  const presentations=React.useMemo(()=>new Map(imagePresentations(body).map(item=>[item.from,item])),[body])
  const media=(offset:number|undefined,children:React.ReactNode,download:string)=>{
    const item=offset===undefined?undefined:presentations.get(offset)
    if(!item||!presentationAvailable(item,note.current))return children
    const name=note.current.attachments?.find(f=>f.id===attachmentLinkId(item.url))?.name||item.label.replace(/\\([\\[\]])/g,'$1')
    if(staticView)return <span className={'paper-presented-media'+(item.image?' is-image':'')}>{children}</span>
    return <ImageActions image={item.image} download={download} name={name} t={t} {...(onPresentation?{change:()=>onPresentation(item)}:{})}>{children}</ImageActions>
  }
  return <div className="note-markdown" style={{ lineHeight: 'inherit', overflowWrap: 'anywhere' }}><Markdown skipHtml remarkPlugins={[remarkGfm,highlightMarkdown(query)]} components={{...components,img:({node,src,alt})=>{
    if(!src||/^https?:/.test(src))return src
      ? <a href={src} target="_blank" rel="noopener noreferrer">{t('markdownExternalImage',{alt:alt||t('markdownImage')})}</a>
      : <span role="img" aria-label={alt??t('markdownImage')}>[{alt||t('markdownImage')}]</span>
    return media(node?.position?.start.offset,<img src={src} alt={alt??''} loading={staticView?"eager":"lazy"} style={{maxWidth:'100%',maxHeight:560,objectFit:'contain'}}/>,src)
  },pre:({node})=>{const child=node?.children.find(n=>n.type==='element'&&n.tagName==='code'),language=child?.type==='element'?String(child.properties.className??'').replace(/^language-/,''):'';return <CodeBlock text={codeText(node)} language={language} t={t} staticView={staticView} query={query} position={node?.position?.start.offset}/>},code:({className,children})=><code className={className}>{typeof children==='string'?<Highlight value={children} query={query}/>:children}</code>,a:({node,href,children})=>{
    const id=noteLinkId(href??''),file=attachmentLinkId(href??'')
    if(id)return <a href={href} onClick={e=>{e.preventDefault();onNoteLink?.(id)}}>{children}</a>
    if(file&&note.current.attachments?.some(a=>a.id===file))return media(node?.position?.start.offset,<a className="paper-file-link" href={attachmentUrl(note,file)} download title={t('attachmentDownload')}><Paperclip size={14}/>{children}</a>,attachmentUrl(note,file))
    const image=href&&resolveNoteImage(href,note)
    if(image)return media(node?.position?.start.offset,<a className="paper-file-link" href={image} download title={t('attachmentDownload')}><Paperclip size={14}/>{children}</a>,image)
    return href?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>
  }}} urlTransform={(url, key) => key === 'src' ? imageUrl(url) ?? safePublicUrl(url) ?? '' : noteLinkId(url)||attachmentLinkId(url)||resolveNoteImage(url,note)?url:safePublicUrl(url) ?? ''}>{body}</Markdown></div>
})
