/** Styles for the DSH right-hand conversation sidebar and its slim 2-layer detail header. */
export const conversationNotesCss = `
.conversation-reference{padding:7px 14px;border-bottom:1px solid var(--rule);font-size:12px}
.conversation-reference p{margin:5px 0;color:var(--muted)}
.conversation-notes button{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:6px;padding:5px 8px;display:inline-flex;align-items:center;gap:5px}
.conversation-notes button:hover{background:var(--selected)}
.conversation-notes-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--base);border-bottom:1px solid var(--rule);flex-shrink:0}
.conversation-notes-head strong,.conversation-notes-head>span{display:flex;align-items:center;gap:8px}
.conversation-notes-tabs{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:0 12px 9px;font-size:12px}
.conversation-notes-tabs [aria-pressed=true]{background:var(--selected);font-weight:600}
.conversation-notes-list{overflow:auto;min-height:0;flex:1;padding:0 12px}
.conversation-notes-list article{position:relative;border-bottom:1px solid var(--rule);padding:5px 0}
.conversation-notes-list .conversation-note-row{display:block;width:100%;text-align:left;padding:9px}
.conversation-note-row strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.conversation-note-row strong svg{margin-inline-end:4px;vertical-align:-2px;color:var(--accent)}
.conversation-note-row p{font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:6px 0}
.conversation-top-bar{display:flex;align-items:stretch;gap:4px;min-height:37px;padding:0 6px 0 4px;background:var(--shelf);border-bottom:1px solid var(--rule);flex:none}
.conversation-top-tabs{flex:1;min-width:0;display:flex;align-items:stretch}
.conversation-top-tabs>.paper-note-tabs{flex:1;padding:4px 2px 0;border-bottom:0;background:transparent}
.conversation-top-tools{display:flex;align-items:center;gap:2px;flex:none}
.conversation-top-tools button{width:28px;height:28px;padding:0!important;justify-content:center}
.conversation-notes .paper-doc-head{padding:5px 12px;margin:0}
.conversation-notes .paper-doc-head .paper-back{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0!important;margin-inline-end:2px;flex:none}
.conversation-note-row small{font-size:11px;color:var(--muted)}
.conversation-notes-foot,.conversation-empty{font-size:12px;color:var(--muted);padding:16px}
.conversation-notes .paper-detail{min-width:0;min-height:0;flex:1;display:flex;flex-direction:column}
.conversation-notes .paper-window-notice{padding:8px 12px}
.conversation-message{padding:6px 14px;font-size:12px}
`

export const conversationBrowseCss = `
.conversation-notes{position:relative}
.conversation-notes-tabs{padding-top:12px;flex-wrap:wrap;flex:none}
.conversation-notes-tabs [aria-pressed=true]{color:var(--accent)}
.conversation-search-area{flex:0 1 auto;min-height:0;overflow:auto;scrollbar-width:thin;padding:1px 12px 0}
.conversation-notes .conversation-scope{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:min(48%,210px);min-height:25px;padding:2px 4px;border:1px solid var(--rule);border-radius:5px;background:var(--input);font-size:12px}
.conversation-scope span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.conversation-scope svg{flex:none}
.conversation-notes .conversation-scope[aria-expanded=true]{background:var(--selected);color:var(--accent)}
.conversation-browse{position:relative;display:flex;flex:1;min-height:0;min-width:0;overflow:hidden}
.conversation-browse[data-browser=true]{min-height:100px}
.conversation-browse[data-book-rail=true]{display:grid;grid-template-columns:var(--conversation-books-width) 5px minmax(0,1fr)}
.conversation-books{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border-inline-end:1px solid var(--rule);padding:4px 3px 0}
.conversation-books-scroll{flex:1;min-height:0;overflow:auto;scrollbar-width:thin}
.conversation-books button{width:100%;text-align:left;justify-content:flex-start;padding:9px 7px;gap:6px;font-size:12px}
.conversation-books button span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.conversation-books small{margin-left:auto;color:var(--muted)}
.conversation-books svg{flex:none}
.conversation-books [aria-current=page]{background:var(--selected);color:var(--accent);font-weight:600}
.conversation-books .paper-menu-row>button:first-of-type{width:auto}
.conversation-books .paper-menu-row>button.paper-row-more{width:25px}
.conversation-books footer{flex:none;border-top:1px solid var(--rule);padding:7px 3px;background:var(--base)}
.conversation-book-divider{cursor:col-resize;touch-action:none;background:transparent}
.conversation-book-divider:is(:hover,:focus){background:var(--accent)}
.conversation-browse .conversation-notes-list{min-width:0;flex:1;padding:0 10px;scrollbar-width:thin}
.conversation-browse .conversation-empty{padding:12px 8px}
.conversation-workspace-title{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px 7px;flex:none;font-size:12px}
.conversation-workspace-title strong{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.conversation-notes-list article .paper-menu-row{padding-right:0}
.conversation-notes-list .conversation-note-row{padding:8px 5px!important;min-height:69px}
.conversation-notes-list .conversation-note-row p{margin:3px 0;font-size:12px}
.conversation-notes-list .paper-menu-row>.paper-row-more{right:0;top:36px;transform:none;margin:0;width:28px;height:26px}
.conversation-relation{position:absolute;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.conversation-relation button,.conversation-relation>span{display:inline-flex;justify-content:center;align-items:center;width:30px;height:28px;position:relative;padding:0!important}
.conversation-link-plus{position:absolute;right:0;bottom:0;font-size:11px;background:var(--paper);line-height:12px}
.conversation-link-spinner{animation:conversation-spin 1s linear infinite}@keyframes conversation-spin{to{transform:rotate(360deg)}}
.conversation-notes-foot{padding:7px 14px;flex:none}
.conversation-books.conversation-book-picker{position:absolute;z-index:12;background:var(--base);border:1px solid var(--rule);border-radius:8px;box-shadow:0 6px 24px #0003}
`

export const referenceListCss = `
.conversation-selection-bar{display:flex;align-items:center;gap:5px;padding:0 14px 7px;flex:none;font-size:12px;flex-wrap:wrap;min-height:28px}
.conversation-selection-bar:not([data-selecting=true]){justify-content:flex-end;padding-top:0;padding-bottom:4px;min-height:24px}
.conversation-selection-bar strong{font-size:12px;font-weight:500;margin-right:auto}
.conversation-selection-bar[data-selecting=true]{padding:6px 12px;background:var(--shelf);border-block:1px solid var(--rule)}
.conversation-selection-bar[data-find=true]:not([data-selecting=true]){padding:0 12px 2px;flex-wrap:nowrap}
.paper-app .conversation-selection-bar>.paper-search-status{flex:1;justify-content:flex-start;gap:8px;margin:0}
.conversation-selection-bar[data-selecting=true]>.paper-search-status{flex-basis:100%}
.conversation-selection-bar[data-find=true]>button{flex:none;white-space:nowrap}
.conversation-notes-list .conversation-relation{right:0;top:10px;max-width:none;width:62px;height:28px;gap:2px;flex-wrap:nowrap}
.conversation-relation .conversation-quote{color:var(--ink)}
.conversation-association[data-linked=true]{color:var(--success,light-dark(#387b4b,#93bf9a))}
.conversation-notes-list article[data-selected=true]{background:var(--selected);border-radius:6px}
.conversation-notes-list:not([data-selecting=true]) .conversation-note-row strong{padding-right:63px}
.conversation-note-check{position:absolute;left:5px;top:16px;width:14px!important;height:14px;margin:0!important;z-index:1;cursor:pointer}
.conversation-selected-row{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--rule)}
.conversation-selected-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.reference-selection-dialog{font-size:13px}
@container paper (max-width:520px){.conversation-notes .paper-actions button[data-compact=true] .paper-action-label{display:none}}
`
