import { api, ApiError } from './api.js'

/** A display path only. The host remains responsible for path and folder validation. */
export function setupFolder(parent:string, repo:string):string {
  const separator=parent.includes('\\')?'\\':'/'
  return parent.replace(/[/\\]+$/,'')+separator+repo
}

export async function pickSetupParent(signal:AbortSignal):Promise<string|null> {
  const desktop=(globalThis as typeof globalThis & {__DSH_DIRECTORY_PICKER__?:{pick():Promise<string|null>}}).__DSH_DIRECTORY_PICKER__
  try {
    // Desktop cancellation must not open a second chooser through the Host.
    const folder=desktop ? await desktop.pick() : (await api('/personal/folder/pick',{},signal)).folder
    signal.throwIfAborted()
    if(folder!==null && (typeof folder!=='string'||!folder.trim()))throw new ApiError('notebook_picker_failed')
    return folder
  }catch(error){
    signal.throwIfAborted()
    if(error instanceof ApiError)throw error
    throw new ApiError('notebook_picker_failed')
  }
}
