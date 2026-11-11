import {readFile,mkdir,writeFile,rename} from 'node:fs/promises'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {digest,id,text,object,fail} from '../notes/validation.js'
import {activeNotebook} from '../notes/notebooks.js'
import type {NoteRepository} from '../notes/repository.js'

/** Device-local workspace choices, isolated by the stable GitHub repository ID. */
export class WorkspaceBooks {
  private chain:Promise<unknown>=Promise.resolve()
  constructor(private dir:string,private repository:NoteRepository,private repositoryId:()=>number|null){}
  request(input:unknown){
    const operation=this.chain.then(async()=>{
      const v=object(input),workspaceId=text(v.workspaceId,512),repo=this.repositoryId()
      if(!workspaceId.trim()||repo===null)fail('note_schema')
      const key=digest(`${repo}\n${workspaceId}`),file=join(this.dir,'workspace-books.json')
      let entries:Record<string,string>={}
      try{const data=object(JSON.parse(await readFile(file,'utf8')));if(data.version!==1)fail('note_version');entries=object(data.entries) as Record<string,string>}
      catch(e){if(!(e instanceof Error&&'code' in e&&e.code==='ENOENT'))throw e}
      const books=await this.repository.listNotebooks()
      if(v.notebookId!==undefined){
        if(v.notebookId===null)delete entries[key]
        else {const bookId=id(v.notebookId);if(!books.some(b=>b.notebookId===bookId&&activeNotebook(b)))fail('notebook_trashed');entries[key]=bookId}
        await mkdir(this.dir,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp'
        await writeFile(tmp,JSON.stringify({version:1,entries}),'utf8');await rename(tmp,file)
      }
      const chosen=entries[key]
      return {ok:true as const,notebookId:chosen&&books.some(b=>b.notebookId===chosen&&activeNotebook(b))?chosen:null}
    })
    this.chain=operation.catch(()=>{});return operation
  }
}
