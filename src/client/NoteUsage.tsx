import * as React from 'react'
import {api} from './api.js'
import {fileSize} from './NoteAttachments.js'
import type {T} from './locale.js'
import type {NotesApiContract} from '../contracts/notes.js'
export function NoteUsage({t,details=false}:{t:T;details?:boolean}){
  const [value,setValue]=React.useState<NotesApiContract['/notes/usage']['response']['usage']|null>(null)
  React.useEffect(()=>{let live=true;const read=()=>void api('/notes/usage',undefined).then(r=>{if(live)setValue(r.usage)}).catch(()=>{});read();const timer=setInterval(read,120_000);return()=>{live=false;clearInterval(timer)}},[])
  if(!value||!details&&value.level==='normal'&&!value.nearLimit)return null
  return <section className={details?'setup-section':'paper-capacity-notice'} aria-label={t('usageTitle')}>
    {details&&<><strong>{t('usageTitle')}</strong><p>{t('usageBytes',{current:fileSize(value.bytes),git:fileSize(value.gitBytes)})}</p><small>{t('usageCounts',{notes:value.notes,revisions:value.revisions})}</small></>}
    {value.level!=='normal'&&<p role="note">{t(value.level==='large'?'usageLarge':'usageNotice')}</p>}
    {value.nearLimit&&<p role="note">{t('usageNearLimit')}</p>}
  </section>
}
