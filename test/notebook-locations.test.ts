import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, rm, writeFile, readFile, readdir, mkdir, rename} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {createApplication} from '../src/host/application.js'
import {runGit, type GitRunner} from '../src/git/backend.js'
import type {GitHubGateway,GitHubRepository} from '../src/onboarding/types.js'
import {NotebookError} from '../src/domain/errors.js'
import {copyForMove} from '../src/private-workspace/move.js'
import {replaceFile} from '../src/notes/files.js'
import {claimFolder} from '../src/private-workspace/folder.js'

const content=(title:string)=>({title,body:title,summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]})
test('an atomic replacement waits out a real Windows sharing lock',{skip:process.platform!=='win32'},async()=>{
  const root=await mkdtemp(join(tmpdir(),'dsh-replace-')),dest=join(root,'document.md'),temp=join(root,'document.tmp')
  await writeFile(dest,'old');await writeFile(temp,'new')
  const lock=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    "$h=[IO.File]::Open($env:DSH_LOCK_TEST_FILE,'Open','Read','ReadWrite');try{[Console]::WriteLine('ready');[Console]::Out.Flush();[void][Console]::ReadLine();Start-Sleep -Milliseconds 100}finally{$h.Dispose()}"],
    {windowsHide:true,env:{...process.env,DSH_LOCK_TEST_FILE:dest}})
  const closed=once(lock,'close')
  try{
    assert.match(String((await Promise.race([once(lock.stdout,'data'),closed]))[0]),/ready/)
    await assert.rejects(rename(temp,dest),(e:NodeJS.ErrnoException)=>['EPERM','EACCES','EBUSY'].includes(e.code??''))
    lock.stdin.end('release\n')
    await replaceFile(temp,dest)
    assert.equal(await readFile(dest,'utf8'),'new')
  }finally{lock.stdin.end();await closed;await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})
test('Windows Git can initialize the long cache paths of named local folders',{skip:process.platform!=='win32'},async()=>{
  const root=await mkdtemp(join(tmpdir(),'dsh-git-long-'))
  try{
    const cache=join(root,'libraries','private-notes','backup','repositories')
    const path=join(cache,'a'.repeat(Math.max(80,230-cache.length)))
    await mkdir(path,{recursive:true})
    await runGit(['init','--initial-branch=main'],{cwd:path})
    assert.match(await readFile(join(path,'.git','HEAD'),'utf8'),/refs\/heads\/main/)
  }finally{await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})
async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'dsh-location-')),home=join(root,'control')
  const repos=new Map<string,GitHubRepository>(),owner={login:'Alice',id:5}
  const gateway:GitHubGateway={available:async()=>true,account:async()=>owner,repository:async(_owner,name)=>repos.get(name)??null,
    createPrivate:async(_owner,name)=>{await runGit(['init','--bare','--initial-branch=main',join(root,name+'.git')]);const r:GitHubRepository={name,id:repos.size+101,owner:owner.login,ownerId:owner.id,visibility:'private'};repos.set(name,r);return r}}
  let git:GitRunner=runGit
  const open=(dir=home)=>createApplication({dir,personal:{gateway,gitRunner:(args,o)=>git(args,o),remoteForTest:b=>pathToFileURL(join(root,b.repo+'.git')).href}})
  let app=await open()
  return {root,home,open,repos,get app(){return app},set git(r:GitRunner){git=r},async restart(){await app.close();app=await open()},
    async connect(folder?:string){const {preview}=await app.backup.preview({repo:'alpha',mode:'create',folder:folder??''});await app.backup.connect({previewId:preview.id,confirmPrivate:true});return app.personalState().sync},
    async close(){await app.close();await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100})}}
}

test('fresh setup only uses a same-named empty folder and does not create a cloud repository during preview',async()=>{
  const f=await fixture(),folder=join(f.root,'自选父目录','alpha')
  try{
    await mkdir(folder,{recursive:true})
    await assert.rejects(f.app.backup.preview({mode:'create',repo:'alpha',folder:join(f.root,'different')}),{code:'notebook_folder_invalid'})
    await writeFile(join(folder,'old.md'),'keep original')
    await assert.rejects(f.app.backup.preview({mode:'create',repo:'alpha',folder}),{code:'notebook_folder_occupied'})
    assert.equal(f.repos.size,0);assert.equal(await readFile(join(folder,'old.md'),'utf8'),'keep original')
    const other=join(f.root,'other','alpha');await mkdir(other,{recursive:true})
    const {preview}=await f.app.backup.preview({mode:'create',repo:'alpha',folder:other})
    assert.equal(preview.folder,other);assert.equal(f.repos.size,0);assert.deepEqual(await readdir(other),[])
    // Recheck immediately before creation: a folder may have gained files since preview.
    await writeFile(join(other,'later.txt'),'new occupant')
    await assert.rejects(f.app.backup.connect({previewId:preview.id,confirmPrivate:true}),{code:'notebook_folder_occupied'})
    assert.equal(f.repos.size,0);assert.equal(await readFile(join(other,'later.txt'),'utf8'),'new occupant')
    const renamed=await f.app.backup.preview({mode:'create',repo:'renamed'})
    assert.equal(renamed.preview.folder,join(f.home,'libraries','renamed'));assert.equal(f.repos.size,0)
  }finally{await f.close()}
})

test('an old folder marker alone does not authorize a fresh installation to adopt local data',async()=>{
  const f=await fixture(),folder=join(f.root,'alpha')
  try{
    await claimFolder(f.home,folder)
    await assert.rejects(f.app.backup.preview({mode:'create',repo:'alpha',folder}),{code:'notebook_folder_occupied'})
    assert.deepEqual(await readdir(folder),['.fatfish-notes-folder']);assert.equal(f.repos.size,0)
  }finally{await f.close()}
})

test('a failed first creation resumes its own claimed empty folder after restart',async()=>{
  const root=await mkdtemp(join(tmpdir(),'setup-retry-')),dir=join(root,'control'),folder=join(root,'alpha'),owner={id:1,login:'Alice'}
  let attempts=0
  const gateway:GitHubGateway={available:async()=>true,account:async()=>owner,repository:async()=>null,createPrivate:async()=>{attempts++;throw new Error('offline')}}
  let app=await createApplication({dir,personal:{gateway}})
  try{
    let checked=await app.backup.preview({mode:'create',repo:'alpha',folder})
    await assert.rejects(app.backup.connect({previewId:checked.preview.id,confirmPrivate:true}))
    assert.equal(attempts,1);assert.deepEqual(await readdir(folder),['.fatfish-notes-folder'])
    await app.close();app=await createApplication({dir,personal:{gateway}})
    checked=await app.backup.preview({mode:'create',repo:'alpha',folder})
    await assert.rejects(app.backup.connect({previewId:checked.preview.id,confirmPrivate:true}))
    assert.equal(attempts,2);assert.equal(app.personalState().sync.binding,null)
  }finally{await app.close();await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})

test('new libraries default to fatfish-notes and keep an explicitly named library on restart',async()=>{
  const f=await fixture()
  try{
    const defaultFolder=join(f.home,'libraries','fatfish-notes')
    const fresh=f.app.personalState().sync
    assert.equal(fresh.folder,defaultFolder)
    assert.equal(fresh.defaultFolder,defaultFolder)
    const {preview}=await f.app.backup.preview({mode:'create'})
    assert.equal(preview.repo,'fatfish-notes')
    assert.equal(preview.folder,defaultFolder)
    await f.app.backup.connect({previewId:preview.id,confirmPrivate:true})
    assert.equal(f.app.personalState().sync.binding?.repo,'fatfish-notes')
    assert.ok(f.repos.has('fatfish-notes'))

    const oldName='my-personal-notes'
    const otherHome=join(f.root,'other-home')
    let other=await f.open(otherHome)
    try{
      const {preview:custom}=await other.backup.preview({mode:'create',repo:oldName})
      assert.equal(custom.folder,join(otherHome,'libraries',oldName))
      await other.backup.connect({previewId:custom.id,confirmPrivate:true})
      const original=other.personalState().sync
      await other.close()
      other=await f.open(otherHome)
      const reopened=other.personalState().sync
      assert.equal(reopened.ready,true)
      assert.deepEqual(reopened.binding,original.binding)
      assert.equal(reopened.binding?.repo,oldName)
      assert.equal(reopened.folder,custom.folder)
    }finally{await other.close()}
  }finally{await f.close()}
})

test('offline move copies the verified notebook and Git cache, preserves pending data and resumes from the new folder',async()=>{
  const f=await fixture(),targetRoot=resolve('test/.tmp')
  await mkdir(targetRoot,{recursive:true})
  const dest=await mkdtemp(join(targetRoot,'notebook-move-'))
  try{
    const s=await f.connect(),old=s.folder,bound=s.binding!.repositoryId
    assert.equal(old,join(f.home,'libraries','alpha'))
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64')
    const asset=await f.app.notes.repository.putAsset(png,'image/png')
    const {note}=await f.app.notes.save({expectedHeads:[],content:{...content('offline note'),assetIds:[asset.id]}})
    await writeFile(join(old,'user-file.txt'),'leave me')
    f.git=async()=>{throw new Error('move must not need Git')}
    await assert.rejects(f.app.backup.move({repositoryId:bound,folder:old}),{code:'notebook_folder_invalid'})
    assert.equal(await f.app.backup.move({repositoryId:bound,folder:dest}),false)
    assert.equal(await readFile(join(old,'user-file.txt'),'utf8'),'leave me')
    await assert.rejects(readdir(join(old,'notes')),{code:'ENOENT'})
    assert.ok((await readdir(join(dest,'backup','repositories'))).length)
    assert.match(await readFile(join(dest,'notes','documents',note.noteId+'.md'),'utf8'),/offline note/)
    assert.deepEqual(await readFile(join(dest,'notes','assets',asset.id)),png)
    assert.equal(f.app.personalState().sync.pending,true)
    await f.restart();assert.equal(f.app.personalState().sync.folder,dest)
    assert.equal((await f.app.notes.get({noteId:note.noteId})).note.current.title,'offline note')
    f.git=runGit;await f.app.backup.sync();assert.equal(f.app.personalState().sync.pending,false)
  } finally {await f.close();await rm(dest,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})

test('moving a legacy bound home preserves control records and ignores unowned files; interrupted copies can retry',async()=>{
  const f=await fixture()
  try{
    const s=await f.connect(),repoId=s.binding!.repositoryId,dest=s.folder
    // Model a previously bound legacy installation, not a new setup into a nonempty home.
    await f.app.close()
    await rename(join(dest,'notes'),join(f.home,'notes'))
    await rm(dest,{recursive:true,force:true,maxRetries:10,retryDelay:100})
    const config=JSON.parse(await readFile(join(f.home,'backup','sync.json'),'utf8'))
    config.folder=f.home;config.locations=[]
    await writeFile(join(f.home,'backup','sync.json'),JSON.stringify(config));await f.restart()
    const note=(await f.app.notes.save({expectedHeads:[],content:content('legacy')})).note
    const foreign=join(f.root,'foreign');await mkdir(foreign);await writeFile(join(foreign,'user.txt'),'keep')
    await assert.rejects(f.app.backup.move({repositoryId:repoId,folder:foreign}),{code:'notebook_folder_invalid'})
    assert.equal(f.app.personalState().sync.folder,f.home)
    await copyForMove(f.home,f.home,dest,repoId,new AbortController().signal)
    await f.app.notes.save({expectedHeads:[],content:content('still in A')})
    assert.equal(await f.app.backup.move({repositoryId:repoId,folder:dest}),false)
    assert.equal((await f.app.notes.get({noteId:note.noteId})).note.current.title,'legacy')
    assert.equal(JSON.parse(await readFile(join(f.home,'backup','sync.json'),'utf8')).folder,dest)
    assert.equal((await f.app.notes.list({})).items.length,2)
  }finally{await f.close()}
})

test('reset uses an independent target; failed or cancelled first sync keeps A, retry activates only B',async()=>{
  const f=await fixture()
  try{
    const s=await f.connect(),id=s.binding!.repositoryId
    const a=(await f.app.notes.save({expectedHeads:[],content:content('only in A')})).note
    const form={repositoryId:id,repo:'beta',mode:'create',folder:''}
    await assert.rejects(f.app.backup.resetPreview(form),{code:'notebook_unsynced'})
    await f.app.backup.sync()
    await assert.rejects(f.app.backup.resetPreview({...form,repo:'alpha'}),{code:'notebook_reset_target'})
    await assert.rejects(f.app.backup.resetPreview({...form,folder:s.folder}),{code:'notebook_folder_invalid'})
    const {preview}=await f.app.backup.resetPreview(form)
    const confirm={repositoryId:id,previewId:preview.id,confirmPrivate:true}
    assert.equal(f.app.personalState().sync.binding?.repo,'alpha')
    const originalTip=(await runGit(['--git-dir',join(f.root,'alpha.git'),'rev-parse','main'])).stdout
    f.git=async(args,o)=>{if(args[0]==='push')throw new NotebookError('git_failed','offline',502);return runGit(args,o)}
    await assert.rejects(f.app.backup.reset(confirm),{code:'git_failed'})
    assert.equal((await f.app.notes.get({noteId:a.noteId})).note.current.title,'only in A')
    await f.restart();assert.equal(f.app.personalState().sync.folder,s.folder)
    f.git=runGit
    const retry=await f.app.backup.resetPreview(form),abort=new AbortController()
    const commit={...confirm,previewId:retry.preview.id}
    f.git=async(args,o)=>{if(args[0]==='push')abort.abort();return runGit(args,o)}
    await assert.rejects(f.app.backup.reset(commit,abort.signal))
    assert.equal(f.app.personalState().sync.binding?.repo,'alpha')
    f.git=runGit;await f.app.backup.reset(commit)
    assert.equal(f.app.personalState().sync.binding?.repo,'beta')
    assert.equal((await f.app.notes.list({})).items.length,0)
    assert.equal((await runGit(['--git-dir',join(f.root,'alpha.git'),'rev-parse','main'])).stdout,originalTip)
    assert.match(await readFile(join(s.folder,'notes','documents',a.noteId+'.md'),'utf8'),/only in A/)
    assert.doesNotMatch((await runGit(['--git-dir',join(f.root,'beta.git'),'ls-tree','-r','--name-only','main'])).stdout,new RegExp(a.noteId))
    await f.restart();assert.equal(f.app.personalState().sync.folder,preview.folder)
    await assert.rejects(f.app.backup.connect({previewId:preview.id,confirmPrivate:true}),{code:'notebook_already_bound'})
  }finally{await f.close()}
})

test('reset into an existing B imports its notes only and blocks writes during cutover',async()=>{
  const f=await fixture()
  try{
    const old=await f.connect(),remoteB=await f.open(join(f.root,'deviceB'))
    try{
      const p=await remoteB.backup.preview({mode:'create',repo:'beta',folder:''})
      await remoteB.backup.connect({previewId:p.preview.id,confirmPrivate:true})
      await remoteB.notes.save({expectedHeads:[],content:content('already in B')})
      await remoteB.backup.sync()
    }finally{await remoteB.close()}
    await f.app.notes.save({expectedHeads:[],content:content('only in A')});await f.app.backup.sync()
    const repositoryId=old.binding!.repositoryId
    const {preview}=await f.app.backup.resetPreview({repositoryId,mode:'existing',repo:'beta',folder:''})
    let checked=false
    f.git=async(args,opts)=>{
      if(!checked && args.includes('ls-remote')){
        checked=true
        await assert.rejects(f.app.notes.save({expectedHeads:[],content:content('late A write')}),{code:'notebook_busy'})
        assert.equal(f.app.personalState().sync.binding?.repo,'alpha')
      }
      return runGit(args,opts)
    }
    await f.app.backup.reset({repositoryId,previewId:preview.id,confirmPrivate:true})
    assert.ok(checked)
    assert.deepEqual((await f.app.notes.list({})).items.map(x=>x.title),['already in B'])
  }finally{await f.close()}
})

test('return by stable identity finds the last moved folder after restart and confirms before reusing it',async()=>{
  const f=await fixture()
  try{
    const a=await f.connect(),id=a.binding!.repositoryId,moved=join(f.root,'我的旧库')
    const original=(await f.app.notes.save({expectedHeads:[],content:content('original A')})).note
    await f.app.backup.move({repositoryId:id,folder:moved});await f.app.backup.sync()
    const b=await f.app.backup.resetPreview({repositoryId:id,mode:'create',repo:'beta',folder:''})
    await f.app.backup.reset({repositoryId:id,previewId:b.preview.id,confirmPrivate:true})
    await f.restart()
    const bId=f.app.personalState().sync.binding!.repositoryId
    // GitHub may rename a repository without changing its database ID.
    const old=f.repos.get('alpha')!
    f.repos.delete('alpha');f.repos.set('renamed',{...old,name:'renamed'})
    await rename(join(f.root,'alpha.git'),join(f.root,'renamed.git'))
    const form={repositoryId:bId,mode:'existing',repo:'renamed',folder:''}
    const tip=async()=>(await runGit(['--git-dir',join(f.root,'renamed.git'),'rev-parse','main'])).stdout
    const before=await tip()
    const {preview}=await f.app.backup.resetPreview(form)
    assert.equal(preview.reuseFolder,true);assert.equal(preview.folder,moved)
    assert.equal(f.app.personalState().sync.folder,b.preview.folder)
    const proof=join(moved,'notes','.fatfish-notes-repository'), saved=await readFile(proof)
    await writeFile(proof,'5/'+bId)
    await assert.rejects(f.app.backup.reset({repositoryId:bId,previewId:preview.id,confirmPrivate:true}),{code:'notebook_previous_folder_unavailable'})
    assert.equal(f.app.personalState().sync.binding?.repo,'beta');assert.equal(await tip(),before)
    await writeFile(proof,saved)
    const elsewhere=join(f.root,'relocated')
    await rename(moved,elsewhere)
    await assert.rejects(f.app.backup.resetPreview(form),{code:'notebook_previous_folder_unavailable'})
    await assert.rejects(f.app.backup.resetPreview({...form,folder:join(f.root,'nothing-here'),folderIntent:'locate'}),{code:'notebook_previous_folder_unavailable'})
    await assert.rejects(f.app.backup.resetPreview({...form,folder:elsewhere,folderIntent:'new'}),{code:'notebook_folder_invalid'})
    const fresh=await f.app.backup.resetPreview({...form,folder:moved,folderIntent:'new'})
    assert.equal(fresh.preview.reuseFolder,undefined);assert.equal(fresh.preview.folder,moved)
    await assert.rejects(readdir(moved),{code:'ENOENT'})
    const custom=await f.app.backup.resetPreview({...form,folder:join(f.root,'empty-copy')})
    assert.equal(custom.preview.reuseFolder,undefined);assert.equal(f.app.personalState().sync.binding?.repo,'beta')
    const located=await f.app.backup.resetPreview({...form,folder:elsewhere,folderIntent:'locate'})
    assert.equal(located.preview.reuseFolder,true)
    await f.app.backup.reset({repositoryId:bId,previewId:located.preview.id,confirmPrivate:true})
    assert.equal(f.app.personalState().sync.folder,elsewhere)
    assert.equal((await f.app.notes.get({noteId:original.noteId})).note.current.body,'original A')
    await f.restart()
    const config=JSON.parse(await readFile(join(f.home,'backup','sync.json'),'utf8'))
    assert.deepEqual(config.locations.filter((l:{repositoryId:number})=>l.repositoryId===id).map((l:{folder:string})=>l.folder),[elsewhere])
    const tree=(await runGit(['--git-dir',join(f.root,'renamed.git'),'ls-tree','-r','--name-only','main'])).stdout
    assert.doesNotMatch(tree,/fatfish-notes-repository|backup\/sync\.json/)
  }finally{await f.close()}
})

test('upgrade remembers the active legacy control folder and allows returning to it',async()=>{
  const f=await fixture()
  try{
    const a=await f.connect(),id=a.binding!.repositoryId
    await f.app.close()
    await rename(join(a.folder,'notes'),join(f.home,'notes'))
    await rm(a.folder,{recursive:true,force:true,maxRetries:10,retryDelay:100})
    const cfg=join(f.home,'backup','sync.json'), legacy=JSON.parse(await readFile(cfg,'utf8'))
    legacy.folder=f.home;delete legacy.locations;await writeFile(cfg,JSON.stringify(legacy))
    await rm(join(f.home,'notes','.fatfish-notes-repository'))
    await f.restart()
    const b=await f.app.backup.resetPreview({repositoryId:id,repo:'beta',mode:'create',folder:''})
    await f.app.backup.reset({repositoryId:id,previewId:b.preview.id,confirmPrivate:true})
    const bId=f.app.personalState().sync.binding!.repositoryId
    const back=await f.app.backup.resetPreview({repositoryId:bId,repo:'alpha',mode:'existing',folder:''})
    assert.equal(back.preview.folder,f.home);assert.equal(back.preview.reuseFolder,true)
    await f.app.backup.reset({repositoryId:bId,previewId:back.preview.id,confirmPrivate:true})
    assert.equal(f.app.personalState().sync.binding?.repositoryId,id)
    assert.equal(f.app.personalState().sync.folder,f.home)
    assert.ok((await readdir(join(b.preview.folder,'notes'))).includes('manifest.json'))
  }finally{await f.close()}
})

test('leaving A verifies its current remote, retains A on failure and pulls a newer remote revision before switching',async()=>{
  const f=await fixture()
  try{
    const a=await f.connect(),id=a.binding!.repositoryId
    const device=await f.open(join(f.root,'another-device'))
    let latest
    try{
      const p=await device.backup.preview({repo:'alpha',mode:'existing',folder:''})
      await device.backup.connect({previewId:p.preview.id,confirmPrivate:true})
      latest=(await device.notes.save({expectedHeads:[],content:content('from another device')})).note
      await device.backup.sync()
    }finally{await device.close()}
    // No local pending changes, but A has not seen the other device's note.
    assert.equal(f.app.personalState().sync.pending,false)
    const document=join(a.folder,'notes','documents',latest.noteId+'.md')
    await assert.rejects(readFile(document),{code:'ENOENT'})
    const b=await f.app.backup.resetPreview({repositoryId:id,repo:'beta',mode:'create',folder:''})
    const confirm={repositoryId:id,previewId:b.preview.id,confirmPrivate:true}
    const remoteA=pathToFileURL(join(f.root,'alpha.git')).href
    f.git=async(args,opts)=>{
      if(args.includes('ls-remote') && args.includes(remoteA))throw new NotebookError('git_failed','source unreachable',502)
      return runGit(args,opts)
    }
    await assert.rejects(f.app.backup.reset(confirm),{code:'git_failed'})
    assert.equal(f.app.personalState().sync.binding?.repositoryId,id)
    let checks=0,concurrentId=''
    const writer=await f.open(join(f.root,'another-device'))
    try{
      f.git=async(args,opts)=>{
        if(args.includes('ls-remote') && args.includes(remoteA) && ++checks===2){
          concurrentId=(await writer.notes.save({expectedHeads:[],content:content('during the final check')})).note.noteId
          await writer.backup.sync()
        }
        return runGit(args,opts)
      }
      await f.app.backup.reset(confirm)
    }finally{await writer.close()}
    assert.ok(concurrentId)
    assert.match(await readFile(join(a.folder,'notes','documents',concurrentId+'.md'),'utf8'),/during the final check/)
    assert.equal(f.app.personalState().sync.binding?.repo,'beta')
    assert.match(await readFile(document,'utf8'),/from another device/)
    assert.equal((await f.app.notes.list({})).items.length,0)
  }finally{await f.close()}
})
