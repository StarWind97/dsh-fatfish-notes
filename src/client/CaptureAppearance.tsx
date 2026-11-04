import * as React from 'react'
import { useSyncExternalStore } from 'react'
import { BookPlus, Download } from 'lucide-react'
import type { T } from './locale.js'
import { readPreference, writePreference } from './paper/layout.js'

type Appearance = 'label' | 'icon'
const changed = 'dsh-notebook-capture-appearance'
const preference = 'captureAppearance'
const getAppearance = (): Appearance => readPreference(preference) === 'icon' ? 'icon' : 'label'
function subscribe(update: () => void) {
  window.addEventListener(changed, update)
  window.addEventListener('storage', update)
  return () => { window.removeEventListener(changed, update); window.removeEventListener('storage', update) }
}
export function useCaptureAppearance() {
  return useSyncExternalStore(subscribe, getAppearance, () => 'label' as const)
}
export function CaptureGlyph({ appearance, t, exporting=false }: { appearance: Appearance; t: T; exporting?:boolean }) {
  const Glyph=exporting?Download:BookPlus
  return <><Glyph aria-hidden="true" strokeWidth={1.65}/>{appearance === 'label' && <span>{t(exporting?'chatExport':'noteCaptureReply')}</span>}</>
}
export function CaptureAppearance({t}: {t:T}) {
  const current = useCaptureAppearance(), group = React.useId()
  return <section className="setup-section capture-preferences">
    <strong>{t('captureAppearance')}</strong>
    <fieldset><legend>{t('captureButtonStyle')}</legend>
      <div className="capture-styles">{(['label','icon'] as const).map(value =>
        <label key={value} className="capture-style-choice">
          <span className="capture-style-label"><input type="radio" name={group} checked={current === value} onChange={() => {
            writePreference(preference, value); window.dispatchEvent(new Event(changed))
          }}/>{t(value === 'label' ? 'captureWithText' : 'captureIconOnly')}</span>
          <span aria-hidden="true"><span className="capture-action capture-example"><CaptureGlyph appearance={value} t={t}/></span><span className="capture-action capture-example"><CaptureGlyph appearance={value} t={t} exporting/></span></span>
        </label>
      )}</div>
    </fieldset>
  </section>
}
