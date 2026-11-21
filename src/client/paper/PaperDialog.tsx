import * as React from 'react'
import { useId, useLayoutEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { dialogCss } from './dialog-style.js'
import {AppearanceStyle,useAppearanceProps} from './appearance.js'

export function PaperDialog({ title, closeLabel, onClose, onCancel, locked = false, children, className='', headerActions }: {
  title:string; closeLabel:string; onClose:()=>void; onCancel?:()=>void; locked?:boolean; children:React.ReactNode; className?:string; headerActions?:React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId()
  const appearance=useAppearanceProps()
  useLayoutEffect(() => {
    const el = ref.current!
    el.showModal()
    return () => el.close()
  }, [])
  useLayoutEffect(() => {
    const dialog = ref.current!
    if (dialog.open && !dialog.contains(document.activeElement)) {
      (dialog.querySelector<HTMLElement>('button:not(:disabled)') ?? dialog).focus({preventScroll:true})
    }
  })
  const close = <button type="button" aria-label={closeLabel} disabled={locked} onClick={onClose}><X size={18}/></button>
  return <dialog tabIndex={-1} ref={ref} className={`paper-dialog ${className}`.trim()} aria-labelledby={titleId} {...appearance}
    onCancel={event=>{event.preventDefault();if(!locked)(onCancel??onClose)()}}>
    <style>{dialogCss}</style><AppearanceStyle/><header><h2 id={titleId}>{title}</h2>{headerActions ? <div className="paper-dialog-actions">{headerActions}{close}</div> : close}</header>
    {children}
  </dialog>
}
