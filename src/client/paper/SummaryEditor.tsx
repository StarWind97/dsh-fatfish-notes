import {useLayoutEffect, useRef, type TextareaHTMLAttributes} from 'react'

type SummaryEditorProps = {
  label: string
  value: string
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled' | 'placeholder' | 'onChange' | 'onCompositionStart' | 'onCompositionEnd'>

const bottomGap = 8

export function SummaryEditor({label, ...inputProps}: SummaryEditorProps) {
  const section = useRef<HTMLElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const card = section.current
    const field = input.current
    const pane = card?.closest<HTMLElement>('.paper-pane')
    if (!card || !field || !pane) return
    let revealedAt = pane.scrollTop

    const fitToPane = (reveal: boolean) => {
      const paneHeight = pane.clientHeight
      if (!paneHeight || !field.getClientRects().length) return
      const paneTop = pane.getBoundingClientRect().top + pane.clientTop
      const paneBottom = paneTop + paneHeight
      const cardBounds = card.getBoundingClientRect()
      const fieldBounds = field.getBoundingClientRect()
      const style = getComputedStyle(field)
      const line = Number.parseFloat(style.lineHeight)
      const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
      const fullPaneRoom = Math.max(line + padding, paneHeight - (cardBounds.height - fieldBounds.height) - bottomGap)
      const minimum = Math.min(Math.ceil(2 * line + padding), Math.floor(fullPaneRoom))
      const cardTop = reveal ? Math.max(cardBounds.top, paneTop) : cardBounds.top
      const room = paneBottom - cardTop - (cardBounds.height - fieldBounds.height) - bottomGap
      const height = Math.max(minimum, Math.min(room, fullPaneRoom))
      card.style.setProperty('--summary-available-height', Math.floor(height) + 'px')

      if (reveal) {
        const fitted = card.getBoundingClientRect()
        const shift = Math.min(0, fitted.top - paneTop) || Math.max(0, fitted.bottom + bottomGap - paneBottom)
        if (shift) pane.scrollBy({top: shift, behavior: 'instant'})
        revealedAt = pane.scrollTop
      }
    }

    const reveal = () => fitToPane(true)
    reveal()
    field.addEventListener('focus', reveal)
    const observer = new ResizeObserver(() => {
      const focused = field.ownerDocument.activeElement === field
      fitToPane(focused || Math.abs(pane.scrollTop - revealedAt) < 1)
    })
    observer.observe(pane)
    const metadata = card.parentElement?.querySelector('.paper-metadata')
    const brief = card.parentElement?.previousElementSibling
    if (metadata) observer.observe(metadata)
    if (brief) observer.observe(brief)
    return () => {
      observer.disconnect()
      field.removeEventListener('focus', reveal)
    }
  }, [])

  return <section ref={section} className="paper-summary" aria-label={label}>
    <label>
      <span>{label}</span>
      <textarea ref={input} aria-label={label} rows={2} {...inputProps}/>
    </label>
  </section>
}
