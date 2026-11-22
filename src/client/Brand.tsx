import * as React from 'react'
import {brandMarks,brandSignature,brandWordmark} from './brand-artwork.js'
import {brandVariant} from './brand-size.js'
import {translator,type T} from './locale.js'

/** Trusted local vector constants, shared by host slots and both notebook views. */
export function BrandMark({size=20,color=false}:{size?:number;color?:boolean}){
  const variant=brandVariant(size),mark=brandMarks[variant]
  return <svg className="fatfish-mark" data-brand={color?'color':'mono'} data-brand-variant={variant} width={size} height={size} viewBox={mark.viewBox} aria-hidden="true" focusable="false" style={{display:'block',flexShrink:0}} dangerouslySetInnerHTML={{__html:color?mark.color:mark.mono}}/>
}

export function BrandSignature({t=translator('zh')}:{t?:T}){
  if(t.language==='en')return <div className="fatfish-signature fatfish-signature-text" role="img" aria-label={t('brandAccessibleName')}><BrandMark size={144} color/><BrandWordmark t={t}/></div>
  return <svg className="fatfish-signature" width={1024} height={1024} viewBox="0 0 1024 1024" role="img" aria-label={t('brandAccessibleName')} focusable="false" dangerouslySetInnerHTML={{__html:brandSignature}}/>
}

export function BrandWordmark({t=translator('zh')}:{t?:T}){
  if(t.language==='en')return <span className="fatfish-wordmark fatfish-wordmark-text" aria-hidden="true">{t('nav')}</span>
  return <svg className="fatfish-wordmark" width={765} height={152} viewBox={brandWordmark.viewBox} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:brandWordmark.artwork}}/>
}
