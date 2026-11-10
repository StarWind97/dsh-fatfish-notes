import type { RecoveryStorage } from './note-recovery.js'
/** Visits are local UI preferences, scoped by the remote repository identity. */
export class RecentNotes {
  constructor(private storage:RecoveryStorage|undefined,private repository:()=>number|undefined){}
  private key(){const id=this.repository();return id===undefined?null:`fatfish-recent:${id}`}
  read():string[]{try{const key=this.key(),value=key&&this.storage?.getItem(key),ids=value?JSON.parse(value):[];return Array.isArray(ids)?[...new Set(ids.filter((id):id is string=>typeof id==='string'&&/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(id)))].slice(0,50):[]}catch{return []}}
  visit(id:string){try{const key=this.key();if(key)this.storage?.setItem(key,JSON.stringify([id,...this.read().filter(n=>n!==id)].slice(0,50)))}catch{/* Browsing remains available when local preferences cannot be saved. */}}
}
