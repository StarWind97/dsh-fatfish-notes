import type { CSSProperties } from 'react'
import { styles } from './style.js'

// Shared primitive tokens and active capture/markdown rules. Legacy .notes-shell layout rules removed.
export const noteFont = "'Segoe UI Variable','Segoe UI','Microsoft YaHei','PingFang SC',system-ui,-apple-system,BlinkMacSystemFont,sans-serif"
export const notesStyles = {
  ...styles,
  button: {
    ...styles.button,
    padding: 'var(--note-button-padding, 7px 12px)',
    borderRadius: 'var(--note-button-radius, 8px)',
    fontFamily: noteFont,
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--note-button-bg, var(--dsw-alias-bg-layer-1, #fff))',
    color: 'var(--note-button-color, var(--dsw-alias-label-primary))',
    borderColor: 'var(--note-button-border, var(--dsw-alias-border-l2))',
  },
  input: { ...styles.input, padding: '9px 11px', borderRadius: 8, fontFamily: noteFont, fontSize: 14, lineHeight: 1.5 },
  label: { ...styles.label, margin: '12px 0', fontSize: 13, lineHeight: 1.8 },
  card: { ...styles.card, padding: 20, borderRadius: 12, background: 'var(--dsw-alias-bg-layer-1, #fff)', overflowWrap: 'anywhere' },
  muted: { ...styles.muted, lineHeight: 1.65 },
  row: { ...styles.row, gap: 8 },
} satisfies Record<string, CSSProperties>

export const notesCss = `
.notes-surface,.notes-nav{font-family:${noteFont};font-size:14px;line-height:1.65;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.notes-surface :where(p,label,strong,h1,h2,h3,h4,legend,summary,button,input,select,textarea),.notes-nav :where(strong,button){font-family:${noteFont}}
.notes-surface :where(h1,h2,h3,h4){line-height:1.4;letter-spacing:-.02em}
.notes-surface h2{font-size:22px}.notes-surface h3{font-size:17px}
.notes-surface :where(button,input,select,textarea):focus-visible,.notes-nav button:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:3px}
.notes-surface button:disabled,.notes-nav button:disabled{opacity:.48;cursor:not-allowed}
.notes-surface button:not(:disabled):hover,.notes-nav button:not(:disabled):hover{--note-button-border:var(--dsw-alias-label-secondary)}
.notes-surface button[aria-pressed="true"],.notes-nav button[aria-pressed="true"]{--note-button-bg:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));--note-button-border:var(--dsw-alias-label-secondary);font-weight:600}
.notes-surface .notes-primary{--note-button-bg:var(--accent,var(--dsw-alias-label-primary));--note-button-color:var(--on-accent,var(--dsw-alias-bg-layer-1,#fff));--note-button-border:transparent;font-weight:600}
.note-markdown table{display:block;max-width:100%;overflow:auto}.note-markdown img{display:block;margin:20px auto;border-radius:8px}
.notes-surface .note-markdown :where(h1,h2,h3,h4){margin-top:1.5em;margin-bottom:.6em}.notes-surface .note-markdown p{margin:1em 0}
.notes-surface .note-markdown :where(code,pre){font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.92em}
.notes-surface .note-markdown blockquote{margin:18px 0;padding:2px 16px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.notes-tags{display:flex;flex-wrap:wrap;gap:6px}.notes-tags button{--note-button-radius:20px;--note-button-padding:3px 10px}
.notes-capture{box-sizing:border-box;box-shadow:0 12px 40px #0002}.notes-capture fieldset{margin:16px 0;padding:12px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}.notes-capture legend{padding:0 6px;font-weight:600}.notes-capture input[type="checkbox"]{accent-color:var(--accent,var(--dsw-alias-label-primary));flex-shrink:0;margin-top:5px}
.notes-capture-message{border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:8px}.notes-capture-message>span{min-width:0;flex:1}.notes-capture-message strong{display:block;margin-bottom:4px}
.notes-capture-save{position:sticky;bottom:-18px;z-index:1;margin-top:12px;padding:12px 0;background:var(--dsw-alias-bg-layer-1,#fff);border-top:1px solid var(--dsw-alias-border-l2)}
`
