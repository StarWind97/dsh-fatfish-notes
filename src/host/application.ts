import { NotesApplication } from './notes.js'
import { GitHubCli } from '../onboarding/cli.js'
import { PrivateWorkspaceSync, type PrivateWorkspaceSyncOptions } from '../private-workspace/sync.js'
import type { NoteModelController } from './note-model.js'
import type { PersonalState } from '../contracts/personal.js'
export interface ApplicationOptions {
  dir: string
  conversation?: () => NoteModelController | undefined
  personal?: Pick<PrivateWorkspaceSyncOptions,'gateway'|'gitRunner'|'remoteForTest'|'batchMs'|'retryMs'>
}
export class NotebookApplication {
  readonly notes: NotesApplication
  readonly backup: PrivateWorkspaceSync
  constructor(private readonly options:ApplicationOptions) {
    this.notes=new NotesApplication(options.dir,options.conversation??(()=>undefined),()=>this.backup.changingLocation?'busy':this.backup.ready)
    this.backup=new PrivateWorkspaceSync({dir:options.dir,notes:this.notes.repository,drainNotes:()=>this.notes.drain(),gateway:options.personal?.gateway??new GitHubCli(),...options.personal})
  }
  personalState():PersonalState { return {ok:true,sync:this.backup.state()} }
  async close() { await Promise.all([this.notes.close(),this.backup.close()]) }
}
export async function createApplication(options:ApplicationOptions) {
  const app=new NotebookApplication(options)
  try {await app.backup.load();return app} catch(error) {await app.close();throw error}
}
