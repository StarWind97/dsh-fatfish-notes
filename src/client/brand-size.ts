/** Logical display width, never the backing bitmap resolution or device pixel ratio. */
export function brandVariant(size:number):'d2'|'d1'|'c0'|'original'{
  return size<=17?'d2':size<28?'d1':size===28?'c0':'original'
}

export function brandSuffix(size:number){
  const variant=brandVariant(size)
  return variant==='original'?'':`-${variant}`
}
