import type {NoteListItem,NoteListOptions,NoteListResult} from '../../contracts/notes.js'
export interface NotebookPage extends NoteListResult {complete:boolean}
/** Metadata only; expansion never loads note bodies. */
export class NotebookPages {
  private pages=new Map<string,NotebookPage>()
  get(id:string){return this.pages.get(id)}
  put(id:string,page:NotebookPage){this.pages.delete(id);this.pages.set(id,page);while(this.pages.size>32)this.pages.delete(this.pages.keys().next().value!)}
  merge(id:string,page:NoteListResult,append:boolean){const old=append?this.pages.get(id)?.items??[]:[];const ids=new Set(old.map(n=>n.noteId));this.put(id,{items:[...old,...page.items.filter(n=>!ids.has(n.noteId))],cursor:page.cursor,complete:true})}
  seed(filter:NoteListOptions,items:NoteListItem[],cursor:string|null){
    if(filter.query||filter.tag||filter.favorite||filter.recentIds||filter.templates||filter.status==='trashed')return
    const byBook=new Map<string,NoteListItem[]>()
    for(const row of items){if(!row.notebookId||row.isTemplate||row.status!=='active')continue;const group=byBook.get(row.notebookId)??[];group.push(row);byBook.set(row.notebookId,group)}
    if(typeof filter.notebookId==='string'){this.put(filter.notebookId,{items:byBook.get(filter.notebookId)??[],cursor,complete:true});return}
    for(const [id,rows] of byBook){const previous=this.pages.get(id);if(previous){const replacements=new Map(rows.map(row=>[row.noteId,row]));this.put(id,{...previous,items:previous.items.map(row=>replacements.get(row.noteId)??row)})}else this.put(id,{items:rows,cursor:null,complete:false})}
  }
  invalidate(){this.pages.clear()}
}
