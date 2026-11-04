import { Text, type ChangeSet } from '@codemirror/state'

/** CM positions count each line break as one. Existing notes may contain CRLF or mixed endings. */
export const editorText=(source:string)=>Text.of(source.split(/\r\n|\r|\n/))
export function editorOffset(source:string,pos:number){return source.slice(0,pos).replace(/\r\n/g,'\n').length}
export function sourceOffset(source:string,pos:number){
  let raw=pos,at=source.indexOf('\r\n')
  while(at>=0&&at<raw){raw++;at=source.indexOf('\r\n',at+2)}
  return Math.min(raw,source.length)
}
export function applyEditorChanges(source:string,changes:ChangeSet){
  let result='',previous=0
  const newline=source.match(/\r\n|\r|\n/)?.[0]??'\n'
  changes.iterChanges((from,to,_a,_b,insert)=>{
    result+=source.slice(previous,sourceOffset(source,from))+insert.sliceString(0,insert.length,newline)
    previous=sourceOffset(source,to)
  })
  return result+source.slice(previous)
}
