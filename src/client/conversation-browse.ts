import type {NotebookView} from '../contracts/notes.js'
import type {RecoveryStorage} from './note-recovery.js'
import {activeNotebook} from '../notes/notebooks.js'
/** Local browsing preference; a workspace name never identifies its data. */
export class ConversationBrowse {
  constructor(private storage:RecoveryStorage|undefined,readonly repository:number,readonly workspace:string|null){}
  private get key(){return `fatfish-browse:${this.repository}:${this.workspace??'ungrouped'}`}
  choose(notebookId:string){try{this.storage?.setItem(this.key,notebookId)}catch{}}
  initial(books:NotebookView[],mapped:string|null):string|null{
    let saved:string|null=null;try{saved=this.storage?.getItem(this.key)??null}catch{}
    const valid=(id:string|null)=>!!id&&books.some(b=>b.notebookId===id&&activeNotebook(b))
    return valid(saved)?saved:valid(mapped)?mapped:null
  }
}
