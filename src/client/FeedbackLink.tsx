import * as React from 'react'
import { MessageSquare } from 'lucide-react'
import type { T } from './locale.js'

export function FeedbackLink({ t }: { t: T }) {
  return <a className="notebook-feedback" href="https://github.com/StarWind97/dsh-github-notebook/issues/new" target="_blank" rel="noopener noreferrer" aria-label={t('feedback')} title={t('feedbackHint')}>
    <MessageSquare size={16} aria-hidden="true" />
    <span className="notebook-feedback-full">{t('feedback')}</span>
    <span className="notebook-feedback-short" aria-hidden="true">{t('feedbackShort')}</span>
  </a>
}

export const feedbackCss = `
a.notebook-feedback{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;padding:5px 8px;border-radius:6px;font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-secondary);text-decoration:none;white-space:nowrap}
a.notebook-feedback:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);text-decoration:none}
a.notebook-feedback:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.notebook-feedback svg{flex:none}.notebook-feedback-short{display:none}
.paper-top>.notebook-feedback{margin-inline-start:auto}.paper-backup+.notebook-feedback{margin-inline-start:0}
.notes-setup header>.notebook-feedback{margin-inline-start:auto}
@container paper (width < 750px){.notebook-feedback-full{display:none}.notebook-feedback-short{display:inline}}
@container notebook-setup (width < 480px){.notebook-feedback-full{display:none}.notebook-feedback-short{display:inline}}
`
