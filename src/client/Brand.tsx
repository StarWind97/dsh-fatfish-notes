import * as React from 'react'
import {smallMark,smallMarkViewBox,smallColorMark,colorMark,brandSignature} from './brand-artwork.js'

/** Trusted local vector constants, shared by host slots and both notebook views. */
export function BrandMark({size=20,color=false}:{size?:number;color?:boolean}){
  const small=!color||size<=32
  return <svg className="fatfish-mark" data-brand={color?'color':'mono'} width={size} height={size} viewBox={small?smallMarkViewBox:'0 0 800 560'} aria-hidden="true" focusable="false" style={{display:'block',flexShrink:0}} dangerouslySetInnerHTML={{__html:color?(small?smallColorMark:colorMark):smallMark}}/>
}

export function BrandSignature(){
  return <svg className="fatfish-signature" width={1024} height={1024} viewBox="0 0 1024 1024" role="img" aria-label="肥鱼笔记 · Fatfish Notes" focusable="false" dangerouslySetInnerHTML={{__html:brandSignature}}/>
}
