import * as React from 'react'
import {Keyboard} from 'lucide-react'
import {PaperDialog} from './PaperDialog.js'
import type {T,LocaleKey} from '../locale.js'

export function shortcutLabel(value:string){return /Mac|iPhone|iPad/.test(globalThis.navigator?.platform??'')?value.replace('Ctrl','⌘'):value}
const shortcuts:Array<[LocaleKey,string]>=[['paperBold','Ctrl+B'],['paperItalic','Ctrl+I'],['paperLink','Ctrl+K'],['paperUndo','Ctrl+Z'],['paperRedo','Ctrl+Shift+Z'],['paperFind','Ctrl+F'],['paperIndent','Tab'],['paperOutdent','Shift+Tab']]
const readingShortcuts:Array<[LocaleKey,string]>=[['readingStart','Home / Ctrl+Home'],['readingEnd','End / Ctrl+End'],['readingPrevious','Page Up'],['readingNext','Page Down']]
export function DocumentTools({body,t}:{body:string;t:T}){
  const [count,setCount]=React.useState<number|null>(null),[failed,setFailed]=React.useState(false),[help,setHelp]=React.useState(false)
  const worker=React.useRef<Worker|null>(null),sequence=React.useRef(0)
  React.useEffect(()=>{
    try{const w=new Worker('/dsh-fatfish-notes/notes/document-worker');worker.current=w
      w.onmessage=({data}:{data:{id:number;words?:number;failed?:boolean}})=>{if(data.id!==sequence.current)return;setFailed(!!data.failed);if(data.words!==undefined)setCount(data.words)}
      w.onerror=()=>setFailed(true)
      return()=>{w.terminate();worker.current=null}
    }catch{setFailed(true);return undefined}
  },[])
  React.useEffect(()=>{const id=++sequence.current;const timer=setTimeout(()=>worker.current?.postMessage({id,body}),350);return()=>clearTimeout(timer)},[body])
  return <><div className="paper-document-tools"><span title={t(failed?'documentStatsFailed':'documentCountHint')}>{failed?'—':count===null?'…':t('documentCount',{count:count.toLocaleString()})}</span><button title={t('documentShortcuts')} onClick={()=>setHelp(true)}><Keyboard size={14}/>{t('documentShortcuts')}</button></div>
    {help&&<PaperDialog title={t('documentShortcuts')} closeLabel={t('paperClose')} onClose={()=>setHelp(false)}><div className="paper-dialog-content">
      <h3>{t('documentReadingKeys')}</h3><dl className="paper-shortcuts">{readingShortcuts.map(([label,key])=><div key={key}><dt>{t(label)}</dt><dd><kbd>{shortcutLabel(key)}</kbd></dd></div>)}</dl><p className="paper-dialog-sub">{t('documentReadingKeysHint')}</p>
      <h3>{t('documentEditingKeys')}</h3><dl className="paper-shortcuts">{shortcuts.map(([label,key])=><div key={key}><dt>{t(label)}</dt><dd><kbd>{shortcutLabel(key)}</kbd></dd></div>)}</dl><p>{t('documentShortcutsHint')}</p><p className="paper-dialog-sub">{t('documentNavigationKeys')}</p>
      </div><footer><button onClick={()=>setHelp(false)}>{t('paperClose')}</button></footer></PaperDialog>}
    <style>{`.paper-document-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 18px;border-top:1px solid var(--rule);font-size:11px;color:var(--muted);background:var(--paper);flex:none}.paper-document-tools button{font-size:11px!important;padding:2px 4px!important}.paper-shortcuts{margin:18px 0}.paper-shortcuts>div{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--rule)}.paper-shortcuts dd{margin:0}.paper-shortcuts kbd{font:12px ui-monospace,monospace}`}</style>
  </>
}
