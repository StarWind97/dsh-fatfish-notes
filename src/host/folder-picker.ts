import { NotebookError } from '../domain/errors.js'

interface NativePicker { capability():{kind:string;pick?:(signal?:AbortSignal)=>Promise<string|null>} }
/** Uses the composed DSH service; never changes the user's workspace. */
export async function pickHostFolder(service:unknown,signal?:AbortSignal):Promise<string|null> {
  if(!service || typeof (service as NativePicker).capability!=='function')throw new NotebookError('notebook_picker_unavailable','当前宿主无法打开目录选择窗口',409)
  const capability=(service as NativePicker).capability()
  if(capability.kind!=='native'||!capability.pick)throw new NotebookError('notebook_picker_unavailable','请在本机 DSH 桌面版中选择保存位置',409)
  try {return await capability.pick(signal)}
  catch {signal?.throwIfAborted();throw new NotebookError('notebook_picker_failed','无法打开目录选择窗口，请重试',500)}
}
