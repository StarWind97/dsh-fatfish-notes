import * as React from 'react'
import { ArrowUpRight, MessageSquare } from 'lucide-react'
import type { T } from './locale.js'
import { useStyleSheet } from './styles/inject.js'

export function FeedbackLink({ t }: { t: T }) {
  useStyleSheet('feedback', feedbackCss, 'components')
  return <a className="notebook-feedback" href="https://github.com/StarWind97/dsh-fatfish-notes/issues/new" target="_blank" rel="noopener noreferrer" aria-label={t('feedback')} title={t('feedbackHint')}>
    <MessageSquare size={15} aria-hidden="true" />
    <span className="notebook-feedback-full">{t('feedback')}</span>
    <span className="notebook-feedback-short" aria-hidden="true">{t('feedbackShort')}</span>
    <ArrowUpRight size={14} className="notebook-feedback-ext" aria-hidden="true" />
  </a>
}

export const feedbackCss = `
a.notebook-feedback{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;padding:5px 10px;border:1px solid transparent;border-radius:7px;font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;color:var(--muted,var(--dsw-alias-label-secondary));text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
a.notebook-feedback:hover{color:var(--ink,var(--dsw-alias-label-primary));background:var(--selected,var(--dsw-alias-bg-layer-2));text-decoration:none}
a.notebook-feedback:focus-visible{outline:2px solid var(--accent,currentColor);outline-offset:2px}
.notebook-feedback svg{flex:none}.notebook-feedback-short{display:none}.notebook-feedback-ext{opacity:.8}
.notes-setup header>.notebook-feedback{margin-inline-start:auto;border-color:color-mix(in srgb,var(--accent,var(--dsw-alias-border-l2)) 28%,var(--rule,var(--dsw-alias-border-l2)));background:var(--selected,var(--dsw-alias-bg-layer-2));color:var(--accent,var(--dsw-alias-label-primary));font-weight:600}
@container paper (width < 1200px){.paper-top .notebook-feedback-full{display:none}.paper-top .notebook-feedback-short{display:inline}}
@container notebook-setup (width < 480px){.notebook-feedback-full{display:none}.notebook-feedback-short{display:inline}}
`
