import type {Appearance} from '../domain/appearance.js'
import type {WindowTheme} from './workspace.js'
export type AppearancePatch=Partial<Omit<Appearance,'version'|'mode'>>
export interface AppearanceState {ok:true;epoch:string;sequence:number;storeId:string;value:Appearance|null;theme:WindowTheme|null}
export interface AppearanceApiContract {
  '/appearance/connect':{request:{legacy:string|null;theme?:WindowTheme};response:AppearanceState}
  '/appearance/update':{request:{storeId:string;operationId:string;patch:AppearancePatch};response:AppearanceState}
  '/appearance/theme':{request:{theme:WindowTheme};response:AppearanceState}
  '/appearance/wait':{request:{epoch:string;sequence:number};response:AppearanceState}
}
