import {matchRanges} from '../../contracts/search.js'
export type CodeTokens={content:string;color?:string}[][]
export function searchedTokens(line:string,tokens:CodeTokens[number]|undefined,query:string){
  const ranges=matchRanges(line,query),result:Array<{content:string;color?:string;match:boolean}>=[];let offset=0
  for(const token of tokens??[{content:line}]){
    const end=offset+token.content.length,points=[offset,...ranges.flatMap(([a,b])=>[a,b]).filter(p=>p>offset&&p<end),end].sort((a,b)=>a-b)
    for(let i=1;i<points.length;i++){const start=points[i-1]!,stop=points[i]!;result.push({content:line.slice(start,stop),...(token.color?{color:token.color}:{}),match:ranges.some(([a,b])=>start>=a&&start<b)})}
    offset=end
  }
  return result
}
export const codeAliases:Record<string,string>={js:'javascript',jsx:'jsx',javascript:'javascript',ts:'typescript',tsx:'tsx',typescript:'typescript',json:'json',py:'python',python:'python',sh:'shellscript',bash:'shellscript',shell:'shellscript',shellscript:'shellscript',yml:'yaml',yaml:'yaml',html:'html',css:'css',sql:'sql'}
export function codeLanguage(language:string){return codeAliases[language.trim().toLowerCase()]??null}
export function highlightAllowed(text:string){return text.length<=100_000&&text.split('\n',2002).length<=2000}
