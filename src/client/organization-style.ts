export const organizationCss=`
.paper-order[hidden]{display:none}
.paper-document[data-loading=true] .paper-pane{opacity:.55;pointer-events:none}
.paper-app mark{color:inherit;background:color-mix(in srgb,var(--accent) 24%,transparent);border-radius:2px;padding:0 1px}
.paper-new-actions,.paper-quick-view{display:flex;align-items:center;gap:5px}.paper-quick-view{margin:10px 0 0;font-size:12px;color:var(--muted)}
.paper-quick-view select{background:transparent;color:var(--ink);border:0;padding:3px 0;max-width:100%}.paper-quick-view small{margin-left:auto}
.paper-tag-suggestions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.paper-tag-suggestions button{display:inline-flex;gap:6px;align-items:center;font-size:12px;background:var(--shelf);border-radius:5px;padding:4px 7px}.paper-tag-suggestions small{color:var(--muted)}
.paper-favorite[aria-pressed=true]{color:var(--accent)}.paper-actions .paper-overflow.always{display:block}.paper-actions .paper-popup{max-width:min(80vw,300px);z-index:20}
.paper-reuse-fields label{display:grid;gap:6px;margin-bottom:14px}.paper-reuse-fields :is(input:not([type=radio]):not([type=checkbox]),select){width:100%;padding:9px 11px;border:1px solid var(--rule);background:var(--base);color:var(--ink);border-radius:7px}
.paper-backlinks{border-top:1px solid var(--rule);margin-top:34px;padding:18px 0;font-size:13px}.paper-backlinks>button,.paper-backlinks li button{display:flex;align-items:center;gap:8px}.paper-backlinks li{margin:6px 0}.paper-backlinks li button{text-align:left}
.paper-history-dialog{width:min(940px,calc(100vw - 32px));height:min(82vh,800px)}.paper-history-body{display:grid;grid-template-columns:210px 1fr;flex:1;min-height:0;overflow:hidden}
.paper-history-body nav{overflow:auto;border-right:1px solid var(--rule);padding:10px}.paper-app .paper-history-body nav button{display:grid;grid-template-columns:minmax(0,1fr);gap:5px;justify-items:start;text-align:left;width:100%;padding:10px;border-radius:6px;margin-bottom:3px}.paper-history-body nav button[aria-pressed=true]{background:var(--shelf);box-shadow:inset 3px 0 var(--accent)}.paper-history-body nav strong{font-size:13px;white-space:nowrap}.paper-history-body nav span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.paper-history-body nav small{color:var(--muted)}
.paper-history-preview{min-width:0;overflow:auto;padding:20px 28px}.paper-history-preview h2{font-family:var(--serif);overflow-wrap:anywhere}.paper-dialog-message{padding:8px 20px;margin:0;font-size:13px}.paper-history-preview blockquote{border-left:3px solid var(--accent);padding-left:12px;margin:16px 0}
.paper-search-jump{font-size:12px;display:flex;gap:6px;align-items:center;color:var(--muted);margin-bottom:15px}.paper-reading:not(:has(mark)) .paper-search-jump{display:none}
.paper-batch{flex-wrap:wrap;gap:5px}.paper-batch select{max-width:100%;background:var(--base);color:var(--ink)}
@media(max-width:650px){.paper-history-body{grid-template-columns:140px 1fr}.paper-history-preview{padding:12px}.paper-history-dialog footer{flex-wrap:wrap}.paper-history-body nav button{padding:7px}}
`
