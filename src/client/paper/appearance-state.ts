/** Local presentation only. Never serialize this into a note or repository. */
export const layouts = {outline:'秩序工作台',soft:'柔和分区',ribbon:'横向导航',dock:'侧轨资料台',ink:'墨线书房',tree:'目录树工作室',island:'浮岛桌面',archive:'边签档案'} as const
export const palettes = {native:'DSH 原生',lilac:'柔紫',mint:'青绿',blue:'雾蓝',amber:'暖砂',rose:'莓红',graphite:'石墨',clearblue:'澄蓝',pine:'松青',inkwhite:'墨白'} as const
export const cjkFonts={host:'跟随 DSH',yahei:'微软雅黑',deng:'等线',song:'宋体',kai:'楷体'} as const
export const latinFonts={host:'跟随 DSH',segoe:'Segoe UI',arial:'Arial',georgia:'Georgia',times:'Times New Roman'} as const
export interface Appearance {
  version:1;layout:keyof typeof layouts;palette:keyof typeof palettes;contrast:'standard'|'soft'|'strong';mode:'host'|'light'|'dark';
  fontCjk:keyof typeof cjkFonts;fontLatin:keyof typeof latinFonts;
  reading:'modern'|'book'|'mixed';size:16|17|18|20;leading:1.65|1.8|2;codeWeight:300|400|500;codeSize:12|14|16;codeWrap:boolean;codeLines:boolean;
  materials:'bottom'|'right';rightStyle:'tabs'|'stack';materialStyle:'compact'|'cards';pinned:boolean;tabs:boolean;density:'compact'|'balanced'|'spacious';
}
export const defaultAppearance:Appearance={version:1,layout:'outline',palette:'native',contrast:'standard',mode:'host',reading:'modern',fontCjk:'host',fontLatin:'host',size:17,leading:1.8,codeWeight:400,codeSize:14,codeWrap:false,codeLines:false,materials:'bottom',rightStyle:'tabs',materialStyle:'compact',pinned:false,tabs:true,density:'compact'}
const options:Partial<Record<keyof Appearance,readonly unknown[]>>={fontCjk:Object.keys(cjkFonts),fontLatin:Object.keys(latinFonts),layout:Object.keys(layouts),palette:Object.keys(palettes),contrast:['standard','soft','strong'],mode:['host','light','dark'],reading:['modern','book','mixed'],size:[16,17,18,20],leading:[1.65,1.8,2],codeWeight:[300,400,500],codeSize:[12,14,16],materials:['bottom','right'],rightStyle:['tabs','stack'],materialStyle:['compact','cards'],density:['compact','balanced','spacious']}
export function appearanceValue(raw:unknown):Appearance {
  const result={...defaultAppearance};if(!raw||typeof raw!=='object'||Array.isArray(raw))return result
  const value=raw as Record<string,unknown>
  if(value.version!==undefined&&value.version!==1)return result
  for(const key of Object.keys(result) as (keyof Appearance)[]){
    // Legacy fixed modes are retired; retain every other local preference.
    if(key==='version'||key==='mode')continue
    const next=value[key],valid=options[key]?.includes(next)??(typeof next==='boolean')
    if(valid)(result as unknown as Record<string,unknown>)[key]=next
  }
  return result
}
export function parseAppearance(raw:string|null):Appearance {try{return appearanceValue(JSON.parse(raw??'null'))}catch{return {...defaultAppearance}}}
export const appearanceKey='dsh-fatfish-notes.private.paper.appearance.v1'
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
