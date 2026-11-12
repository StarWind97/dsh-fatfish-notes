import * as React from 'react'
import { useId, useLayoutEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { dialogCss } from './dialog-style.js'

export function PaperDialog({ title, closeLabel, onClose, onCancel, locked = false, children, className='' }: {
  title:string; closeLabel:string; onClose:()=>void; onCancel?:()=>void; locked?:boolean; children:React.ReactNode; className?:string
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId()
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
  return <dialog tabIndex={-1} ref={ref} className={`paper-dialog ${className}`.trim()} aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();if(!locked)(onCancel??onClose)()}}>
    <style>{dialogCss}</style><header><h2 id={titleId}>{title}</h2><button type="button" aria-label={closeLabel} disabled={locked} onClick={onClose}><X size={18}/></button></header>
    {children}
  </dialog>
}
