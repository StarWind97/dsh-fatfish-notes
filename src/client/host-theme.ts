import type {WindowTheme} from '../contracts/workspace.js'
export function readTheme():WindowTheme|undefined {
  // Host appearance must not be sampled from the plugin's independent palette.
  const root=document.body
  const style=getComputedStyle(root)
  const color=(key:string,fallback:string)=>{const probe=document.createElement('span');probe.style.color=`var(${key},${fallback})`;root.append(probe);const value=getComputedStyle(probe).color;probe.remove();return value}
  const background=color('--dsw-alias-bg-layer-1','#ffffff'),foreground=color('--dsw-alias-label-primary','#202124')
  const rgb=background.match(/[\d.]+/g)?.slice(0,3).map(Number)??[255,255,255]
  return {dark:style.colorScheme==='dark'||(rgb[0]!+rgb[1]!+rgb[2]!)<384,background,foreground,muted:color('--dsw-alias-label-secondary','#707070'),border:color('--dsw-alias-border-l2','#dddddd'),language:document.documentElement.lang.startsWith('en')?'en':'zh'}
}
export function applyTheme(theme:WindowTheme){const root=document.documentElement;root.style.colorScheme=theme.dark?'dark':'light';for(const [name,value]of Object.entries({'--dsw-alias-bg-layer-1':theme.background,'--dsw-alias-label-primary':theme.foreground,'--dsw-alias-label-secondary':theme.muted,'--dsw-alias-border-l2':theme.border}))root.style.setProperty(name,value);root.lang=theme.language}
