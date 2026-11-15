import {canonical,date,digest,fail,hash,id,keys,object} from './validation.js'

/** Additive immutable sidecar: older readers keep these files without interpreting them. */
export type OrganizationEvent = {version:1;clock:number;recordedAt:string;revision:string} & ({kind:'pin';noteId:string;pinned:boolean}|{kind:'book-order';ids:string[]})
export const organizationPath=(event:OrganizationEvent)=>`organization/${event.revision}.json`
export function createOrganization(input:Omit<Extract<OrganizationEvent,{kind:'pin'}>,'revision'>|Omit<Extract<OrganizationEvent,{kind:'book-order'}>,'revision'>):OrganizationEvent{
  const v=object(input);keys(v,['version','clock','recordedAt','kind',...(v.kind==='pin'?['noteId','pinned']:['ids'])])
  if(v.version!==1||!Number.isSafeInteger(v.clock)||Number(v.clock)<1||!['pin','book-order'].includes(String(v.kind)))fail('note_schema')
  const base={version:1 as const,clock:Number(v.clock),recordedAt:date(v.recordedAt)}
  if(v.kind==='pin'){
    if(typeof v.pinned!=='boolean')fail('note_schema')
    const row={...base,kind:'pin' as const,noteId:id(v.noteId),pinned:v.pinned};return {...row,revision:digest(canonical(row))}
  }
  if(!Array.isArray(v.ids)||v.ids.length>5000)fail('note_limit')
  const ids=v.ids.map(id);if(new Set(ids).size!==ids.length)fail('note_schema')
  const row={...base,kind:'book-order' as const,ids};return {...row,revision:digest(canonical(row))}
}
export function validateOrganization(raw:unknown):OrganizationEvent{
  const {revision,...rest}=object(raw),event=createOrganization(rest as Parameters<typeof createOrganization>[0]);if(hash(revision)!==event.revision)fail('note_hash');return event
}
export function mergeOrganization(...inputs:Array<OrganizationEvent[]|undefined>):OrganizationEvent[]{
  const rows=inputs.flatMap(x=>x??[]);if(rows.length>200000)fail('note_limit')
  const merged=[...new Map(rows.map(row=>{const r=validateOrganization(row);return [r.revision,r]})).values()];if(merged.length>100000)fail('note_limit')
  return merged.sort((a,b)=>a.clock-b.clock||a.revision.localeCompare(b.revision))
}
export function organizationState(events:OrganizationEvent[]=[]){
  const pins=new Map<string,boolean>();let order:string[]=[]
  for(const row of [...events].sort((a,b)=>a.clock-b.clock||a.revision.localeCompare(b.revision)))if(row.kind==='pin')pins.set(row.noteId,row.pinned);else order=row.ids
  return {pins,order}
}
export function organizationManifest(events:OrganizationEvent[]):string{
  const data={version:1,events:events.map(e=>e.revision).sort()};return canonical({...data,revision:digest(canonical(data))})
}
export function validateOrganizationManifest(raw:unknown,events:OrganizationEvent[],exact:boolean){
  const v=object(raw);keys(v,['version','events','revision']);const {revision,...data}=v
  if(v.version!==1||!Array.isArray(v.events)||v.events.length>100000||revision!==digest(canonical(data)))fail('note_manifest')
  const known=new Set(events.map(e=>e.revision)),ids=v.events.map(hash)
  if(new Set(ids).size!==ids.length||ids.some(h=>!known.has(h))||exact&&known.size!==ids.length)fail('note_manifest')
}
