/** Browser entries inject bundled assets; server rendering never loads binary modules. */
export let highlightWorkerSource=''
export let codeFontCss=''
export function configureAppearanceAssets(worker:string,font:string){
  highlightWorkerSource=worker
  codeFontCss=`@font-face{font-family:"Cascadia Code";src:url("${font}") format("woff2");font-weight:200 700;font-display:swap}`
}
