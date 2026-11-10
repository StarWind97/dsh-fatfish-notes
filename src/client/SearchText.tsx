import * as React from 'react'
import {matchRanges} from '../contracts/search.js'
export function Highlight({value,query}:{value:string;query?:string|undefined}) {
  const pieces:React.ReactNode[]=[],ranges=matchRanges(value,query??'');let offset=0
  for(const [start,end]of ranges){pieces.push(value.slice(offset,start),<mark key={start}>{value.slice(start,end)}</mark>);offset=end}
  return <>{pieces}{value.slice(offset)}</>
}
