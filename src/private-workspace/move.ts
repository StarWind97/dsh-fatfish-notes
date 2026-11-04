import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, lstat, mkdir, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { NotebookError } from '../domain/errors.js'
import { missing, safePath } from '../notes/files.js'
import { checkFolder, distinctFolder, emptyFolder, folderMarker } from './folder.js'

const receipt = '.dsh-notebook-move'
const managed = ['notes','backup/repositories']
function changed():never {throw new NotebookError('notebook_move_changed','资料夹内容发生变化，请检查后重试',409)}
async function checksum(path:string) {
  const hash=createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
async function inventory(root:string):Promise<Map<string,string|null>> {
  const files=new Map<string,string|null>()
  async function visit(name:string) {
    const path=join(root,name)
    const info=await lstat(path).catch(e=>{if(missing(e))return null;throw e})
    if(!info)return
    if(info.isSymbolicLink() || (info.isFile() && info.nlink>1))changed()
    if(info.isFile()){files.set(name,await checksum(path));return}
    if(!info.isDirectory())changed()
    files.set(name,null)
    for(const item of await readdir(path))await visit(join(name,item))
  }
  for(const name of managed){await safePath(join(root,name));await visit(name)}
  return files
}
/** Source stays authoritative until the caller commits the new configuration.
 * The receipt allows retrying an interrupted copy to precisely the same target. */
export async function copyForMove(home:string,source:string,target:string,repoId:number,signal:AbortSignal) {
  distinctFolder(home,source,target)
  await checkFolder(home,source,true)
  await safePath(target)
  const proof=JSON.stringify({home,source,repoId})
  const marker=join(target,receipt)
  await safePath(marker)
  const prior=await readFile(marker,'utf8').catch(e=>{if(missing(e))return null;throw e})
  if(prior===null) {
    await emptyFolder(target)
    await mkdir(target,{recursive:true})
    await writeFile(marker,proof,{flag:'wx',mode:0o600})
  }else if(prior!==proof)changed()
  const ownership=join(target,folderMarker)
  await safePath(ownership)
  const owner=await readFile(ownership,'utf8').catch(e=>{if(missing(e))return null;throw e})
  if(owner===null)await writeFile(ownership,home,{flag:'wx',mode:0o600})
  else if(owner!==home)changed()
  const original=await inventory(source), existing=await inventory(target)
  for(const name of existing.keys())if(!original.has(name))changed()
  for(const [name,digest] of original){
    signal.throwIfAborted()
    const path=join(target,name)
    if(existing.has(name) && existing.get(name)===digest)continue
    if(digest===null)await mkdir(path,{recursive:true})
    else{await mkdir(dirname(path),{recursive:true});await copyFile(join(source,name),path)}
  }
  const copy=await inventory(target), current=await inventory(source)
  if(original.size!==copy.size || original.size!==current.size)changed()
  for(const [name,digest] of original)if(copy.get(name)!==digest || current.get(name)!==digest)changed()
  return async()=>{
    await unlink(marker)
    // Only remove inventoried files. Extra files, the control directory of an
    // older installation and every unrelated sibling remain in place.
    for(const [name,digest] of [...original].reverse()){
      const path=join(source,name);await safePath(path)
      if(digest===null)await rmdir(path)
      else {if(await checksum(path)!==digest)changed();await unlink(path)}
    }
    if(relative(home,source)){
      await unlink(join(source,folderMarker))
      for(const path of [join(source,'backup'),source])await rmdir(path).catch(e=>{if(!missing(e) && e.code!=='ENOTEMPTY')throw e})
    }
  }
}
