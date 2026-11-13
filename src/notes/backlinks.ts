import type {NoteView} from '../contracts/notes.js'
import {linkedNotes} from './relations.js'

/** Derived only from validated revisions; rebuilding never writes user data. */
export class BacklinkIndex {
  private outgoing=new Map<string,{revision:string;targets:Set<string>}>()
  private incoming=new Map<string,NoteView[]>()
  update(views:NoteView[]):void {
    const outgoing=new Map<string,{revision:string;targets:Set<string>}>(),incoming=new Map<string,NoteView[]>()
    for(const view of views){
      if(view.current.status!=='active'||view.current.isTemplate)continue
      const previous=this.outgoing.get(view.noteId)
      const entry=previous?.revision===view.current.revision?previous:{revision:view.current.revision,targets:linkedNotes(view.current.body)}
      outgoing.set(view.noteId,entry)
      for(const target of entry.targets){
        if(target===view.noteId)continue
        const rows=incoming.get(target)??[];rows.push(view);incoming.set(target,rows)
      }
    }
    this.outgoing=outgoing;this.incoming=incoming
  }
  get(noteId:string):NoteView[]{return this.incoming.get(noteId)??[]}
}
