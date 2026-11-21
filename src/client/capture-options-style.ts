export const captureOptionsCss = `
.paper-dialog.capture-save{--capture-width:556px;--capture-inline-inset:32px;--capture-block-inset:32px;width:min(var(--capture-width),calc(100dvw - var(--capture-inline-inset)));max-width:calc(100dvw - var(--capture-inline-inset));max-height:calc(100dvh - var(--capture-block-inset))}
.paper-dialog.capture-save-expanded{--capture-width:1280px;height:min(780px,calc(100dvh - var(--capture-block-inset)))}
.paper-dialog.capture-save-review{--capture-width:680px}
.capture-save:modal{overscroll-behavior:contain}
.capture-save::backdrop{overflow:hidden;overscroll-behavior:contain}
.capture-save>header{display:grid;grid-template-columns:minmax(0,1fr) auto}
.capture-save>header h2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.capture-save>header .paper-dialog-actions{flex-wrap:nowrap;white-space:nowrap}
.capture-save>header .capture-layout-icon{display:none}
.capture-save .capture-save-panel{position:static;inset:auto;width:100%;flex:1;min-height:0;max-height:none;border:0;border-radius:0;z-index:auto}
.capture-save [hidden]{display:none!important}
.capture-save .capture-save-warning{flex:none;margin:0;padding:8px 16px;border-bottom:1px solid var(--rule);color:var(--muted);font-size:12px}
.capture-save-body,.capture-save-review-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}
.capture-save-review-body{padding:12px 20px}
.capture-save-review-body .capture-turns{margin:0}
.capture-save-range,.capture-save-files,.capture-save-details{box-sizing:border-box;min-width:0;padding:14px 20px;display:grid;gap:9px;align-content:start}
.capture-save-range{padding-bottom:0}
.capture-save-files{padding-top:9px;border-bottom:1px solid var(--rule)}
.capture-save .capture-scope{justify-self:start}
.capture-save-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;min-width:0;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--dsw-alias-bg-layer-2,var(--base));font-size:13px}
.capture-save-summary>div:first-child small{display:block;color:var(--muted);font-size:12px}
.capture-save-actions{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:6px}
.capture-save-summary>button{justify-self:end}
.capture-save .capture-return{background:var(--selected)}
.capture-save .capture-file-hint{margin:0 0 8px;color:var(--muted);font-size:12px}
.capture-save .capture-save-foot{justify-content:flex-end;flex-wrap:wrap;padding:12px 20px;background:var(--base)}
.capture-save .capture-save-foot span{margin-right:auto}
.capture-save .capture-turns{margin-top:0}
.capture-save .capture-turn-line button{min-width:0}
.capture-save .capture-column-scroll{min-height:0;max-height:42dvh;overflow:auto;overscroll-behavior:contain}
.capture-save-expanded .capture-save-range{padding-bottom:14px;border-bottom:1px solid var(--rule)}
.capture-save-expanded .capture-save-files{padding-top:14px}
.capture-save-expanded .capture-save-summary{padding:0;background:transparent;border:0}
.capture-save-expanded .capture-save-files .capture-save-summary{grid-template-columns:minmax(0,1fr)}
@media(min-width:1100px){
  .capture-save-expanded .capture-save-body{display:grid;grid-template-columns:minmax(0,1.34fr) minmax(0,1fr) minmax(0,1.02fr);overflow:hidden}
  .capture-save-expanded :is(.capture-save-range,.capture-save-files,.capture-save-details){min-height:0;display:flex;flex-direction:column;align-items:stretch}
  .capture-save-expanded :is(.capture-save-range,.capture-save-files){border-bottom:0;border-right:1px solid var(--rule)}
  .capture-save-expanded .capture-scope{align-self:flex-start}
  .capture-save-expanded .capture-column-scroll{flex:1;max-height:none}
  .capture-save-expanded .capture-save-details{overflow:auto;overscroll-behavior:contain}
}
@media(max-width:520px){
  .paper-dialog.capture-save{--capture-inline-inset:12px}
  .capture-save>header{padding-inline:8px;gap:4px}
  .capture-save>header .paper-dialog-actions{gap:4px}
  .capture-save>header button{box-sizing:border-box;width:32px;min-height:32px;padding:0;justify-content:center}
  .capture-save>header .capture-layout-label{display:none}
  .capture-save>header .capture-layout-icon{display:block}
  .capture-save :is(.capture-save-range,.capture-save-files,.capture-save-details,.capture-save-review-body,.capture-save-foot){padding-left:12px;padding-right:12px}
  .capture-save-summary{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:160px){
  .capture-save>header{padding-inline:4px;gap:2px}
  .capture-save>header .paper-dialog-actions{gap:2px}
  .capture-save>header button{width:24px;min-height:24px}
}
@media(max-height:320px){
  .paper-dialog.capture-save{--capture-block-inset:12px}
  .capture-save>header{padding-block:4px}
  .capture-save .capture-save-foot{padding-block:6px}
}
@media(max-height:180px){
  .capture-save .capture-save-panel{display:block;overflow:auto;overscroll-behavior:contain}
  .capture-save :is(.capture-save-body,.capture-save-review-body,.capture-column-scroll){overflow:visible}
  .capture-save .capture-column-scroll{max-height:none}
}
`
