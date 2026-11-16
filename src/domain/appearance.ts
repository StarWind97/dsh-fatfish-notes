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
