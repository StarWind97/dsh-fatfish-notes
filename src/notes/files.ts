import { createHash, randomUUID } from 'node:crypto'
import { mkdir, lstat, readdir, open, rename, link, unlink } from 'node:fs/promises'
import { resolve, dirname, join, parse } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fail, relativePath } from './validation.js'
import { NOTE_LIMITS } from './types.js'
import {FileInventory,inventoryStamp,type FileInventorySnapshot} from './inventory.js'

export const missing = (e: unknown): boolean => e instanceof Error && 'code' in e && e.code === 'ENOENT'
/** Retry the same atomic replacement when Windows briefly denies delete sharing. */
export async function replaceFile(temp:string,target:string):Promise<void> {
  const waits=[20,50,100,200,300]
  for(let attempt=0;;attempt++){
    try {await rename(temp,target);return}
    catch(error){
      const wait=waits[attempt]
      if(process.platform!=='win32' || wait===undefined || !['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code??''))throw error
      await delay(wait)
    }
  }
}
export function utf8(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { fail('note_encoding', '笔记文件不是有效 UTF-8，原件已保留') }
}
export async function safePath(path: string): Promise<void> {
  const absolute = resolve(path), root = parse(absolute).root
  let current = root
  for (const part of absolute.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    current = join(current, part)
    const info = await lstat(current).catch(e => { if (missing(e)) return null; throw e })
    if (info?.isSymbolicLink() || (info?.isFile() && info.nlink > 1)) fail('note_path', '笔记路径包含链接，已停止读取或写入')
  }
}
/** Files are never read through links. Bounded reads avoid allocation from a changed file size. */
export async function readBytes(path: string, limit: number): Promise<Buffer> {
  await safePath(path)
  const handle = await open(path, 'r')
  try {
    const info = await handle.stat()
    if (!info.isFile() || info.nlink > 1 || info.size > limit) fail('note_limit')
    const output = Buffer.alloc(info.size + 1); let count = 0
    while (count < output.length) {
      const { bytesRead } = await handle.read(output, count, output.length - count, count)
      if (!bytesRead) break
      count += bytesRead
    }
    if (count !== info.size) fail('note_changed', '文件读取期间发生变化')
    return output.subarray(0, count)
  } finally { await handle.close() }
}
export async function syncDirectory(path: string): Promise<void> {
  // Windows does not expose directory fsync through Node; file fsync is always required.
  if (process.platform === 'win32') return
  const handle = await open(path, 'r'); try { await handle.sync() } finally { await handle.close() }
}
export class NoteFiles {
  private checked=new Map<string,{stamp:string;bytes:number}>()
  readonly inventory:FileInventory
  constructor(readonly root: string, readonly beforeWrite?: (path: string) => void | Promise<void>) {this.inventory=new FileInventory(root,()=>this.scan(),safePath)}
  /** Content-addressed references are rechecked whenever the file identity or timestamp changes. */
  async check(relative:string,limit:number,verify:(bytes:Buffer)=>void):Promise<number>{
    const path=this.path(relative);await safePath(path)
    const stamp=async()=>{const s=await lstat(path,{bigint:true});if(!s.isFile()||s.nlink>1n)fail('note_path');return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':')}
    const before=await stamp(),key=`${relative}:${limit}`,cached=this.checked.get(key)
    if(cached?.stamp===before)return cached.bytes
    const bytes=await this.read(relative,limit);verify(bytes)
    if(await stamp()!==before)fail('note_changed')
    if(this.checked.size>20000)this.checked.clear()
    this.checked.set(key,{stamp:before,bytes:bytes.length});return bytes.length
  }
  path(relative: string): string { return join(this.root, relativePath(relative)) }
  /** Job discovery never walks documents or immutable revision history. */
  async listJobs():Promise<string[]> {
    const folder=join(this.root,'jobs');await safePath(folder)
    const entries=await readdir(folder,{withFileTypes:true}).catch(e=>{if(missing(e))return [];throw e}),ids:string[]=[]
    for(const entry of entries){
      const info=await lstat(join(folder,entry.name))
      if(info.isSymbolicLink()||(info.isFile()&&info.nlink>1))fail('note_path')
      if(!/^[a-f0-9]{64}\.json$/.test(entry.name))continue
      if(!info.isFile()||info.size>NOTE_LIMITS.scan)fail('note_path')
      ids.push(entry.name.slice(0,-5))
    }
    return ids.sort()
  }
  async read(relative: string, limit = NOTE_LIMITS.scan): Promise<Buffer> { return readBytes(this.path(relative), limit) }
  async remove(relative: string): Promise<void> {
    const path = this.path(relative); await safePath(path)
    await this.beforeWrite?.(relative)
    this.inventory.changed(relative)
    try{await unlink(path).catch(e => { if (!missing(e)) throw e })}finally{this.inventory.changed(relative)}
  }
  async write(relative: string, data: string | Buffer, immutable: boolean): Promise<void> {
    const path = this.path(relative), bytes = Buffer.isBuffer(data) ? data : Buffer.from(data)
    await safePath(path)
    const previous = await this.read(relative).catch(e => { if (missing(e)) return null; throw e })
    if (previous?.equals(bytes)) return
    if (immutable && previous) fail('note_corrupt', '已有不可变文件与新内容不一致，原件已保留')
    await this.beforeWrite?.(relative)
    this.inventory.changed(relative)
    await mkdir(dirname(path), { recursive: true }); await safePath(path)
    const temp = join(dirname(path), `.tmp-${randomUUID()}`), handle = await open(temp, 'wx', 0o600)
    try { await handle.writeFile(bytes); await handle.sync() } finally { await handle.close() }
    try {
      await safePath(path)
      if (immutable) {
        try { await link(temp, path) } catch (e) {
          if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST') || !(await this.read(relative)).equals(bytes)) throw e
        }
      } else await replaceFile(temp, path)
    } finally { await unlink(temp).catch(e => { if (!missing(e)) throw e });this.inventory.changed(relative) }
    await syncDirectory(dirname(path))
  }
  async scan(): Promise<FileInventorySnapshot> {
    await safePath(this.root)
    const paths: string[] = [], stamps = new Map<string,string>(),directories=new Map<string,string>(); let bytes = 0, entries = 0
    const walk = async (directory: string, prefix: string, depth: number): Promise<void> => {
      if (depth > 8) fail('note_path')
      const directoryStat=await lstat(directory,{bigint:true}).catch(e=>{if(missing(e))return null;throw e})
      if(directoryStat)directories.set(prefix.replace(/\/$/,''),inventoryStamp(prefix.replace(/\/$/,''),directoryStat))
      let listing = await readdir(directory, { withFileTypes: true }).catch(e => { if (missing(e)) return []; throw e })
      // A crash between link(temp, target) and unlink(temp) leaves exactly two
      // links. Remove only our recognizable staging link to the same owned inode.
      for (const entry of listing.filter(e => /^\.tmp-[0-9a-f-]{36}$/.test(e.name))) {
        const staged = await lstat(join(directory, entry.name))
        if (!staged.isFile() || staged.isSymbolicLink() || staged.nlink !== 2) continue
        for (const candidate of listing.filter(e => /^[a-f0-9]{64}\.(json|png|jpg|gif|webp|bin)$/.test(e.name))) {
          const rel = `${prefix}${candidate.name}`
          try { relativePath(rel) } catch { continue }
          const target = await lstat(join(directory, candidate.name))
          if (target.isFile() && !target.isSymbolicLink() && target.ino === staged.ino && target.dev === staged.dev && target.nlink === 2) { await unlink(join(directory, entry.name)); await syncDirectory(directory); break }
        }
      }
      if (listing.some(e => /^\.tmp-[0-9a-f-]{36}$/.test(e.name)))
        listing = await readdir(directory, { withFileTypes: true }).catch(e => { if (missing(e)) return []; throw e })
      for (const entry of listing) {
        if (++entries > NOTE_LIMITS.revisions * 3) fail('note_limit')
        const path = join(directory, entry.name), rel = `${prefix}${entry.name}`
        const stat = await lstat(path, { bigint: true })
        if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1n)) fail('note_path')
        if (stat.isDirectory()) await walk(path, `${rel}/`, depth + 1)
        else if (stat.isFile()) {
          bytes += Number(stat.size); if (Number(stat.size) > NOTE_LIMITS.scan) fail('note_limit', '存在超出支持范围的单个文件'); paths.push(rel)
          // Nanosecond change time detects replacements and writes even if mtime is restored.
          stamps.set(rel,inventoryStamp(rel,stat))
        }
        else fail('note_path')
      }
    }
    await walk(this.root, '', 0); return { paths: paths.sort(), bytes, stamps,directories, fingerprint: createHash('sha256').update([...stamps.values()].sort().join('\n')).digest('hex') }
  }
}
