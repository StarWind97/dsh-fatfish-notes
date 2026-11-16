import type {Appearance} from '../../domain/appearance.js'
export * from '../../domain/appearance.js'
const accent:Record<Appearance['palette'],[string,string]>={native:['#4176e6','#7aaaff'],lilac:['#70529b','#bfa3e8'],mint:['#276b60','#82c8b9'],blue:['#3b6483','#90b9da'],amber:['#855b32','#dbb486'],rose:['#98465f','#e6a0b5'],graphite:['#465463','#b0bfce'],clearblue:['#285dce','#8fb2ff'],pine:['#176753','#79cfb3'],inkwhite:['#303b4c','#c1cfdf']}
export type AppearanceColors={paper:string;shelf:string;ink:string;muted:string;rule:string;accent:string;selected:string;overlay:string;input:string}
export function appearanceColors(value:Appearance,dark:boolean,host?:Partial<AppearanceColors>):AppearanceColors {
  const a=accent[value.palette][dark?1:0],base=dark?'#151517':'#ffffff',shelf=dark?'#1b1b1c':'#f9fafb'
  const native:AppearanceColors={paper:base,shelf,ink:dark?'#f9fafb':'#0f1115',muted:dark?'#cfd3d6':'#61666b',rule:dark?'#ffffff1f':'#0000001a',accent:a,selected:dark?'#ffffff14':'#26314810',overlay:dark?'#232324':'#ffffff',input:dark?'#2c2c2e':'#ffffff',...host}
  const result=value.palette==='native'?native:{...native,paper:`color-mix(in srgb, ${base} 98%, ${a})`,shelf:`color-mix(in srgb, ${base} ${dark?87:94}%, ${a})`,accent:a,selected:`color-mix(in srgb, ${base} ${dark?78:85}%, ${a})`,rule:`color-mix(in srgb, ${base} 78%, ${a})`}
  if(value.contrast==='soft')return {...result,shelf:`color-mix(in srgb, ${result.paper} 55%, ${result.shelf})`,rule:`color-mix(in srgb, ${result.paper} 50%, ${result.rule})`}
  if(value.contrast==='strong')return {...result,rule:dark?'#ffffff55':'#00000040',selected:`color-mix(in srgb, ${result.paper} ${dark?65:78}%, ${result.accent})`}
  return result
}
