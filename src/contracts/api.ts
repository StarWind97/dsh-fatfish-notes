import type { PersonalApiContract } from './personal.js'
import type { NotesApiContract } from './notes.js'
import type { WorkspaceApiContract } from './workspace.js'
import type { AppearanceApiContract } from './appearance.js'
export interface ErrorResponse { ok:false; status:'error'; error:string; code:string; previousFolder?:string;affectedCount?:number }
export interface ApiContract extends PersonalApiContract, NotesApiContract, WorkspaceApiContract, AppearanceApiContract {}
export type ApiPath = keyof ApiContract
export type ApiSuccess = ApiContract[ApiPath]['response']
export type ApiResponse = ApiSuccess | ErrorResponse
