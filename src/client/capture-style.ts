export const captureCss = `
.chat-export{box-sizing:border-box;width:min(460px,calc(100vw - 24px));max-height:80vh;overflow:auto;margin:auto;padding:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 18px 64px #0003;font:inherit;font-size:14px}
.chat-export::backdrop{background:#14171b66}.chat-export header,.chat-export footer{display:flex;align-items:center;gap:8px;padding:13px 18px}.chat-export header{justify-content:space-between;border-bottom:1px solid var(--dsw-alias-border-l2)}.chat-export h2{margin:0;font-size:18px}.chat-export footer{justify-content:flex-end;border-top:1px solid var(--dsw-alias-border-l2)}
.chat-export button,.chat-export select{background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);padding:6px 10px}.chat-export button{display:inline-flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}.chat-export button:disabled{opacity:.5}.chat-export header button{border:none}.chat-export .chat-export-primary,.chat-export button[aria-pressed=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}
.chat-export-body{padding:16px 18px;display:grid;gap:10px}.chat-export fieldset{min-width:0;border:none;padding:0;margin:0}.chat-export legend,.chat-export label{font-weight:550}.chat-export-ranges{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.chat-export label{display:grid;gap:6px}.chat-export select{width:100%;font-weight:400}.chat-export p{margin:0}.chat-export-count,.chat-export-hint{font-size:12px;color:var(--dsw-alias-label-secondary)}.chat-export [role=alert]{padding-inline-start:9px;border-inline-start:2px solid var(--dsw-alias-label-secondary)}
.capture-action-wrap{position:relative;display:inline-flex;align-items:center;flex:none}
.capture-action-wrap[hidden]{display:none}
.capture-inline-turn{display:inline-flex;align-self:flex-start;align-items:center;gap:7px;min-height:26px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);font-size:12px;cursor:pointer}
.capture-inline-turn[data-picked=true]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.capture-inline-turn input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-label-primary)}.capture-inline-turn:has(input:focus-visible){outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}
.capture-bar-wrap{box-sizing:border-box;flex:none;width:calc(100% - 2 * var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,760px);margin:0 auto;outline:none}
.capture-bar{padding:7px 10px;box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 3px 12px #0001;font:inherit;font-size:13px}
.capture-bar-row{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.capture-bar-row strong{display:inline-flex;align-items:center;gap:6px;margin-inline:2px 8px;font-weight:500}.capture-bar-space{flex:1}
.capture-bar button,.capture-back{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;padding:5px 8px;border-radius:6px;cursor:pointer}
.capture-bar button:hover,.capture-bar button[aria-pressed=true],.capture-back:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.capture-bar button.capture-bar-save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);padding-inline:12px}.capture-bar button:disabled{opacity:.45;cursor:default}
.capture-bar button:focus-visible{outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}.capture-bar small{display:block;color:var(--dsw-alias-label-secondary);margin:4px}
.capture-foot .capture-back{margin-inline-start:auto}
.capture-action{display:inline-flex;align-items:center;justify-content:center;gap:5px;box-sizing:border-box;height:calc(28px + var(--dsh-content-font-delta,0px));min-width:calc(28px + var(--dsh-content-font-delta,0px));margin:0;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,5px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:calc(12px + var(--dsh-content-font-delta,0px));line-height:1;white-space:nowrap;cursor:pointer}
.capture-action svg{width:calc(17px + var(--dsh-content-font-delta,0px));height:calc(17px + var(--dsh-content-font-delta,0px))}
.capture-action:hover,.capture-action:focus-visible,.capture-head button:hover,.capture-turn-line button:hover,.capture-expand:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.capture-action:focus-visible,.capture-panel :focus-visible{outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}
.capture-tip{display:none;position:absolute;left:50%;bottom:calc(100% + 4px);transform:translateX(-50%);z-index:4;pointer-events:none;white-space:nowrap;padding:4px 8px;border-radius:5px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);font-size:12px}
.capture-action-wrap:hover .capture-tip,.capture-action-wrap:focus-within .capture-tip{display:block}
.notes-surface.capture-panel{position:absolute;inset:auto 0 100%;z-index:60;display:flex;flex-direction:column;max-height:70vh;min-width:0;overflow:hidden;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.capture-head,.capture-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;padding:12px 18px}
.capture-head{border-bottom:1px solid var(--dsw-alias-border-l2)}.capture-head strong,.capture-result,.capture-progress{display:flex;align-items:center;gap:9px}
.capture-head button,.capture-expand,.capture-turn-line button{font:inherit;border:0;color:var(--dsw-alias-label-secondary);background:transparent;cursor:pointer}
.capture-head button{width:28px;height:28px;border-radius:6px;display:grid;place-items:center}
.capture-scroll{padding:14px 18px;overflow:auto;min-height:0}.capture-scroll p{margin:8px 0}
.capture-scope{display:inline-flex;gap:2px;padding:3px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.capture-scope button{border:0;padding:4px 12px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:13px;border-radius:5px}
.capture-scope button[aria-pressed=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l2)}
.capture-turns,.capture-whole{margin-top:11px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;overflow:hidden}.capture-turns:empty{display:none}
.capture-turn+.capture-turn{border-top:1px solid var(--dsw-alias-border-l2)}
.capture-turn-line,.capture-turn-line button,.capture-whole{display:flex;align-items:center;gap:9px}.capture-turn-line{padding:1px 8px 1px 12px}
.capture-turn-line button{flex:1;min-width:0;text-align:start;padding:8px 4px;border-radius:4px}.capture-turn-line button[aria-expanded=true] svg,.capture-expand[aria-expanded=true] svg{transform:rotate(180deg)}
.capture-panel input[type=checkbox]{accent-color:var(--dsw-alias-label-primary);flex:none;width:14px;height:14px;margin:0}.capture-turn-excerpt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;color:var(--dsw-alias-label-primary)}
.capture-turn-index,.capture-turn-line small,.capture-whole small,.capture-options small,.capture-foot span{color:var(--dsw-alias-label-secondary);font-size:12px}
.capture-turn-index,.capture-turn-line small{white-space:nowrap}.capture-turn-line small{padding:0 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2)}
.capture-expand{display:inline-flex;gap:5px;align-items:center;padding:5px 4px;margin-top:4px;font-size:13px;border-radius:4px}
.capture-messages{padding:0 12px 5px 34px}.capture-messages .notes-capture-message{display:flex;align-items:baseline;gap:8px;margin:0;padding:6px 0;border:0}
.capture-messages .notes-capture-message>span>span{display:block;white-space:pre-wrap;overflow-wrap:anywhere}
.capture-whole{padding:12px;background:var(--dsw-alias-bg-layer-2)}.capture-whole div{flex:1}.capture-whole small{display:block}
.capture-options{display:grid;gap:9px;margin-top:14px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);font-size:13px}
.capture-options label{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.capture-options select{max-width:100%;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit}
.capture-foot{border-top:1px solid var(--dsw-alias-border-l2)}.capture-progress svg{animation:capture-spin 1.2s linear infinite}@keyframes capture-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.capture-progress svg{animation:none}}
.notes-setup .capture-preferences fieldset{margin:0;padding:0;border:0}.capture-preferences legend{font-size:13px;color:var(--dsw-alias-label-secondary);margin-bottom:8px}
.capture-styles{display:flex;flex-wrap:wrap;gap:8px}.notes-setup .capture-style-choice{flex:1;min-width:124px;display:grid;gap:6px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;cursor:pointer}.capture-style-choice:has(:checked){background:var(--dsw-alias-bg-layer-2)}
.capture-style-label{display:flex;gap:7px;align-items:center;font-size:13px}.notes-setup .capture-style-label input{width:14px;accent-color:var(--dsw-alias-label-primary)}.capture-example{justify-self:start;pointer-events:none;margin-left:14px}
`
