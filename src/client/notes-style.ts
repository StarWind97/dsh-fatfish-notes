import type { CSSProperties } from 'react'
import { styles } from './style.js'

// Local to the notebook and its conversation slot.
export const noteFont = "'Segoe UI','Microsoft YaHei','PingFang SC',system-ui,-apple-system,BlinkMacSystemFont,sans-serif"
export const notesStyles = {
  ...styles,
  button: { ...styles.button, padding: 'var(--note-button-padding, 7px 12px)', borderRadius: 'var(--note-button-radius, 8px)', fontFamily: noteFont, fontSize: 13, lineHeight: 1.5, background: 'var(--note-button-bg, var(--dsw-alias-bg-layer-1, #fff))', color: 'var(--note-button-color, var(--dsw-alias-label-primary))', borderColor: 'var(--note-button-border, var(--dsw-alias-border-l2))' },
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
.notes-surface .notes-primary{--note-button-bg:var(--dsw-alias-label-primary);--note-button-color:var(--dsw-alias-bg-layer-1,#fff);--note-button-border:var(--dsw-alias-label-primary);font-weight:600}
.notes-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,#fff)}
.notes-nav strong{margin-right:auto;font-size:16px}
.notes-app{display:flex;flex-direction:column;min-height:0}.notes-app>.notes-nav{flex-shrink:0}
.notes-shell{display:flex;flex-direction:column;flex:1;min-height:0;width:100%;max-width:1320px;margin:0 auto;padding:28px 24px;box-sizing:border-box}
.notes-heading{display:flex;flex-shrink:0;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.notes-heading h2{margin:0}.notes-heading p{margin:6px 0 0}
.notes-columns{display:grid;flex:1;min-height:0;grid-template-columns:minmax(230px,280px) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:28px}
.notes-library,.notes-detail-column{min-width:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:3px;scrollbar-gutter:stable}
.notes-filters{padding:4px 16px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff)}
.notes-list-item{display:block;width:100%;text-align:left;margin:0 0 10px;white-space:normal;overflow-wrap:anywhere}
.notes-list-item strong{display:block;font-size:14px;line-height:1.55}
.notes-list-item[aria-current="true"]{--note-button-bg:var(--dsw-alias-bg-layer-2);--note-button-border:var(--dsw-alias-label-secondary);box-shadow:inset 3px 0 0 var(--dsw-alias-label-primary)}
.notes-list-item p:empty{display:none}
.notes-detail,.notes-detail-column{min-width:0}
.notes-detail{padding:18px 22px 24px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff)}
.notes-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:16px 0 10px}
.notes-mode-group{display:flex;gap:4px;flex-wrap:wrap;padding:4px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.notes-transfers{display:flex;flex-wrap:wrap;align-items:start;gap:8px;margin:0 0 20px;padding-bottom:16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.notes-transfer{min-width:0;max-width:100%}.notes-transfer[data-open="true"]{flex-basis:100%}
.notes-transfer>button+button{margin-left:8px}.notes-transfer>div{margin-bottom:0}
.notes-reading{max-width:760px;margin:24px auto}.notes-reading>h1{font-size:26px;margin:0 0 14px}
.notes-reading>.note-markdown{margin-top:22px}.note-markdown table{display:block;max-width:100%;overflow:auto}.note-markdown img{display:block;margin:20px auto;border-radius:8px}
.notes-surface .note-markdown :where(h1,h2,h3,h4){margin-top:1.5em;margin-bottom:.6em}.notes-surface .note-markdown p{margin:1em 0}
.notes-surface .note-markdown :where(code,pre){font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.92em}
.notes-surface .note-markdown blockquote{margin:18px 0;padding:2px 16px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.notes-tags{display:flex;flex-wrap:wrap;gap:6px}.notes-tags button{--note-button-radius:20px;--note-button-padding:3px 10px}
.notes-jobs{margin-top:24px;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2)}.notes-jobs:empty{display:none}
.notes-capture{box-sizing:border-box;box-shadow:0 12px 40px #0002}.notes-capture fieldset{margin:16px 0;padding:12px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}.notes-capture legend{padding:0 6px;font-weight:600}.notes-capture input[type="checkbox"]{accent-color:var(--dsw-alias-label-primary);flex-shrink:0;margin-top:5px}
.notes-capture-message{border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:8px}.notes-capture-message>span{min-width:0;flex:1}.notes-capture-message strong{display:block;margin-bottom:4px}
.notes-capture-save{position:sticky;bottom:-18px;z-index:1;margin-top:12px;padding:12px 0;background:var(--dsw-alias-bg-layer-1,#fff);border-top:1px solid var(--dsw-alias-border-l2)}
@media(max-width:1000px){.notes-columns{grid-template-columns:minmax(210px,240px) minmax(0,1fr);gap:18px}.notes-shell{padding:20px 18px}.notes-detail{padding:16px}.notes-nav{padding:12px 18px}}
@media(max-width:800px){.notes-columns{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;gap:12px}.notes-shell[data-selected="true"] .notes-library{display:none}.notes-shell[data-selected="true"] .notes-detail-column{grid-row:1 / -1}.notes-shell[data-selected="false"] .notes-detail-column{max-height:220px}.notes-shell{padding:16px 12px}.notes-heading{margin-bottom:18px}.notes-nav{padding:12px}.notes-nav strong{flex-basis:100%;margin:0}.notes-detail{padding:14px}.notes-reading>h1{font-size:23px}.notes-heading h2{font-size:20px}.notes-capture{padding:14px!important}.notes-capture-save{bottom:-14px}}
`
