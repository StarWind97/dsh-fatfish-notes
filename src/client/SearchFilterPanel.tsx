import * as React from 'react'
import {useEffect, useMemo, useState} from 'react'
import {Check, ChevronUp} from 'lucide-react'
import type {NoteCatalog, NoteListOptions} from '../contracts/notes.js'
import type {NotesController} from './notes-controller.js'
import type {T} from './locale.js'

type Props = {
  controller: NotesController
  filter: NoteListOptions
  t: T
  onTag: (tag: string) => void
  onPeriod: (period: NonNullable<NoteListOptions['modifiedPeriod']> | '') => void
  onFiles: (enabled: boolean) => void
  close: () => void
}

export function SearchFilterPanel({controller, filter, t, onTag, onPeriod, onFiles, close}: Props) {
  const [tags, setTags] = useState<NoteCatalog['tags']>([])
  const [status, setStatus] = useState<'loading'|'ready'|'failed'>('loading')
  const [draft, setDraft] = useState('')
  const [all, setAll] = useState(false)
  const [attempt, retry] = useState(0)
  const epoch = controller.catalogEpoch
  useEffect(() => {
    const request = new AbortController()
    setStatus('loading')
    void controller.api('/notes/catalog', undefined, request.signal).then(result => {
      if (request.signal.aborted) return
      setTags(result.tags)
      setStatus('ready')
    }).catch(() => { if (!request.signal.aborted) setStatus('failed') })
    return () => request.abort()
  }, [controller, epoch, attempt])
  const directory = useMemo(() => [...tags].sort((a,b) => a.tag.localeCompare(b.tag,'zh-CN',{numeric:true})), [tags])
  const term = draft.trim().toLocaleLowerCase()
  const candidates = term ? directory.filter(entry => entry.tag.toLocaleLowerCase().includes(term)) : all ? directory : tags.slice(0,8)

  return <section className="paper-search-filter-panel" aria-label={t('findFilters')} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <header><strong>{t('findFilters')}</strong><button type="button" onClick={close}><ChevronUp size={14}/>{t('findCollapse')}</button></header>
    <input autoFocus type="search" aria-label={t('findTagName')} placeholder={t('findTagName')} value={draft} onChange={e => setDraft(e.target.value)}/>
    {status === 'ready' ? <>
      <div className="paper-tag-heading"><span>{term ? t('findTagCount',{count:candidates.length}) : t(all ? 'findAllByName' : 'findCommonTags')}</span>
        {tags.length > 8 && !term && <button type="button" onClick={() => setAll(!all)}>{all ? t('findCommonOnly') : t('findAllTags',{count:tags.length})}</button>}</div>
      <div className="paper-tag-suggestions">{candidates.map(({tag,count}) =>
        <button key={tag} type="button" data-tag={tag} title={tag} aria-pressed={filter.tag === tag} onClick={() => {setDraft('');onTag(tag)}}>
          {filter.tag === tag && <Check size={12}/>}<span>#{tag}</span><small>{count}</small></button>)}</div>
      {!candidates.length && <small role="status">{t(term ? 'findNoTagMatch' : 'findNoTags')}</small>}
    </> : <small role="status">{t(status === 'failed' ? 'findCatalogFailed' : 'loading')} {status === 'failed' && <button type="button" onClick={() => retry(n => n+1)}>{t('noteRetry')}</button>}</small>}
    <div className="paper-filter-options"><label>{t('findModified')} <select value={filter.modifiedPeriod ?? ''} onChange={event => onPeriod(event.target.value as Parameters<Props['onPeriod']>[0])}>
      <option value="">{t('findTimeAny')}</option><option value="month">{t('findThisMonth')}</option><option value="before-month">{t('findBeforeMonth')}</option>
    </select></label><label><input type="checkbox" checked={!!filter.hasFiles} onChange={event => onFiles(event.target.checked)}/>{t('findFilesOnly')}</label></div>
    <button type="button" className="paper-filter-refresh" onClick={() => void controller.refresh(true,true)}>{t('refresh')}</button>
  </section>
}
