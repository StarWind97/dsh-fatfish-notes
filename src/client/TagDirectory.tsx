import * as React from 'react'
import type {TagEntry} from '../contracts/notes.js'
import {Highlight} from './SearchText.js'
import type {T} from './locale.js'

export const foldTag=(name:string)=>name.normalize('NFKC').replace(/\s+/gu,'').toLocaleLowerCase()
const pageSize=20
export function TagDirectory({tags,source,target,picking,pick,onSearch,onCancel,t}:{tags:TagEntry[];source:string;target:string;picking:boolean;pick:(name:string)=>void;onSearch:()=>void;onCancel:()=>void;t:T}){
  const [query,setQuery]=React.useState(''),[order,setOrder]=React.useState(picking?'name':'count')
  const [group,setGroup]=React.useState('all'),[page,setPage]=React.useState(0)
  const input=React.useRef<HTMLInputElement>(null),list=React.useRef<HTMLDivElement>(null)
  const term=foldTag(query),origin=foldTag(source)
  const rows=React.useMemo(()=>{
    const names=new Map<string,number>()
    for(const entry of tags){const key=foldTag(entry.tag);names.set(key,(names.get(key)??0)+1)}
    const rank=(name:string)=>term?(name===term?0:name.startsWith(term)?1:2):picking&&name===origin?0:1
    return tags.filter(({tag,count})=>(!picking||tag!==source)&&foldTag(tag).includes(term)&&
      (group==='all'||(group==='one'?count===1:names.get(foldTag(tag))!>1)))
      .sort((a,b)=>rank(foldTag(a.tag))-rank(foldTag(b.tag))||
        (order==='count'?b.count-a.count:order==='rare'?a.count-b.count:0)||a.tag.localeCompare(b.tag,'zh-CN',{numeric:true}))
  },[tags,source,origin,term,order,group,picking])
  const max=Math.max(0,Math.ceil(rows.length/pageSize)-1),current=Math.min(page,max)
  React.useEffect(()=>{if(picking)input.current?.focus()},[picking])
  React.useEffect(()=>{if(list.current)list.current.scrollTop=0},[current,query,group,order])
  // A chip in a note can point outside the directory's previous search or page.
  const located=React.useRef('')
  React.useEffect(()=>{
    if(!picking&&source&&tags.length&&located.current!==source){
      const at=rows.findIndex(r=>r.tag===source)
      if(at>=0){located.current=source;setPage(Math.floor(at/pageSize))}
      else {setQuery('');setGroup('all');setPage(0)}
    }
  },[source,rows,tags.length,picking])
  const visible=rows.slice(current*pageSize,(current+1)*pageSize)
  return <aside className="class-directory" onKeyDown={e=>{if(picking&&e.key==='Escape'&&!e.nativeEvent.isComposing){e.preventDefault();onCancel()}}}><h3>{t(picking?'classPick':'classDirectory')}</h3>
    {picking&&<small>{t('classFrom')} · #{source}</small>}
    <input type="search" ref={input} aria-label={t(picking?'classPick':'findTagName')} placeholder={t('findTagName')} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);if(picking)onSearch()}} onKeyDown={e=>{
      if(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)return
      const first=visible[0]
      if(first&&e.key==='ArrowDown'){e.preventDefault();list.current?.querySelector('button')?.focus()}
      if(first&&picking&&e.key==='Enter'){e.preventDefault();pick(first.tag)}
    }}/>
    <div className="class-options">{!picking&&<select aria-label={t('classDirectory')} value={group} onChange={e=>{setGroup(e.target.value);setPage(0)}}>
      <option value="all">{t('classAllTags')}</option><option value="near">{t('classSimilar')}</option><option value="one">{t('classOnce')}</option></select>}
    <select aria-label={t('paperSort')} value={order} onChange={e=>{setOrder(e.target.value);setPage(0)}}><option value="name">{t('classNameOrder')}</option><option value="count">{t('classFrequent')}</option>{!picking&&<option value="rare">{t('classRare')}</option>}</select></div>
    <small>{t('findTagCount',{count:rows.length})}</small>
    <div className="class-tag-rows" ref={list} onKeyDown={e=>{
      const button=e.target as HTMLButtonElement
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=e.key==='ArrowDown'?button.nextElementSibling:button.previousElementSibling;(next as HTMLButtonElement|null)?.focus()}
    }}>{visible.map(r=><button key={r.tag} aria-pressed={r.tag===(picking?target:source)} onClick={()=>pick(r.tag)}>
      <span>#<Highlight value={r.tag} query={query}/></span><small>{t('notesBookCount',{count:r.count})}{!picking&&r.books&&' · '+t('classBooksCount',{count:r.books.length})}</small>
      {picking&&foldTag(r.tag)===origin&&<em>{t('classSimilar')}</em>}</button>)}
      {!rows.length&&<small>{t('findNoTagMatch')}</small>}
    </div>{max>0&&<footer><button disabled={!current} aria-label={t('classPrevPage')} onClick={()=>setPage(current-1)}>‹</button>{current+1} / {max+1}<button disabled={current===max} aria-label={t('classNextPage')} onClick={()=>setPage(current+1)}>›</button></footer>}</aside>
}
