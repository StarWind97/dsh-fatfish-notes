/** Run on an isolated fixture copy, never the daily notebook directory.
 * node --import tsx scripts/measure-notes.ts <fixture-root> <note-id> [repository-module]
 * JSON goes to stdout; this measures repository work, not UI paint or network sync.
 */
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import type {NoteRepository as Repository} from '../src/notes/repository.js'

const [directory,noteId,modulePath='lib/notes/repository.js']=process.argv.slice(2)
if(!directory||!noteId)throw Error('Provide an isolated fixture root and a note ID')
const {NoteRepository}=await import(pathToFileURL(resolve(modulePath)).href) as {NoteRepository:typeof Repository}
const repository=new NoteRepository(resolve(directory),{beforeWrite:()=>{throw Error('Fixture requires a write; prepare an initialized copy first')}})
const read=repository.files.read.bind(repository.files)
let reads=0,bytes=0
repository.files.read=async(...args)=>{const data=await read(...args);reads++;bytes+=data.length;return data}
const samples:{operation:string;ms:number;reads:number;bytes:number}[]=[]
async function measure(operation:string,work:()=>Promise<unknown>){reads=0;bytes=0;const start=performance.now();await work();samples.push({operation,ms:Math.round(performance.now()-start),reads,bytes})}
await measure('cold-list',()=>repository.list())
for(let i=0;i<5;i++){
 await measure('warm-list',()=>repository.list())
 await measure('warm-notebooks',()=>repository.listNotebooks())
 await measure('warm-detail',()=>repository.get(noteId))
}
const objects=await repository.exportObjects(),note=await repository.get(noteId),listing=await repository.files.scan()
console.log(JSON.stringify({at:new Date().toISOString(),node:process.version,notes:new Set(objects.revisions.map(r=>r.noteId)).size,revisions:objects.revisions.length,files:listing.paths.length,noteCharacters:note.current.body.length,dataHash:createHash('sha256').update(JSON.stringify(objects)).digest('hex'),samples},null,2))
