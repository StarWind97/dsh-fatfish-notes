import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApplication, type ApplicationOptions } from '../../src/host/application.js'
import { runGit } from '../../src/git/backend.js'
import type { GitHubRepository } from '../../src/onboarding/types.js'

/** Exercise normal notebook handlers on an initialized private test repository. */
export async function createBoundApplication(options:ApplicationOptions) {
  const remote=join(options.dir,'test-remote.git'),account={login:'Alice',id:1}
  await runGit(['init','--bare','--initial-branch=main',remote])
  let repo:GitHubRepository|null=null
  const app=await createApplication({...options,personal:{
    remoteForTest:()=>pathToFileURL(remote).href,
    gateway:{available:async()=>true,account:async()=>account,repository:async()=>repo,
      createPrivate:async()=>repo={id:2,name:'test',owner:account.login,ownerId:account.id,visibility:'private'}}
  }})
  try {
    const {preview}=await app.backup.preview({mode:'create',repo:'test',folder:options.dir})
    await app.backup.connect({previewId:preview.id,confirmPrivate:true})
    return app
  }catch(e){await app.close();throw e}
}
