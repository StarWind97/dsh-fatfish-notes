// Dialogs also render in host conversation slots, outside .paper-app.
export const dialogCss=`
.paper-dialog{--ink:var(--dsw-alias-label-primary,#222);--muted:var(--dsw-alias-label-secondary,#777);--base:var(--dsw-alias-bg-layer-1,#fff);--rule:var(--dsw-alias-border-l2,#ddd);--selected:color-mix(in srgb,var(--base) 86%,#28a99e);--accent:color-mix(in srgb,var(--ink) 25%,#28a99e);box-sizing:border-box;color:var(--ink);background:var(--base);border:1px solid var(--rule);border-radius:14px;padding:0;box-shadow:0 20px 70px #0004;overflow:hidden;margin:auto;font:inherit}
/* Each dialog starts with its own size defaults. Feature classes set preferences. */
.paper-dialog{
  --paper-dialog-width:680px;
  --paper-dialog-height:fit-content;
  --paper-dialog-inline-inset:32px;
  --paper-dialog-block-inset:32px;
  width:var(--paper-dialog-width);
  height:var(--paper-dialog-height);
  max-width:max(0px,calc(100dvw - var(--paper-dialog-inline-inset)));
  max-height:max(0px,calc(100dvh - var(--paper-dialog-block-inset)));
}
.paper-dialog[open]{display:flex;flex-direction:column}.paper-dialog::backdrop{background:#10121665}
.paper-dialog-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.paper-dialog>header,.paper-dialog>footer{display:flex;align-items:center;padding:14px 20px;gap:8px;flex:none}.paper-dialog>header{justify-content:space-between;border-bottom:1px solid var(--rule)}.paper-dialog>header h2{font-family:inherit;font-weight:600;font-size:18px;line-height:1.4;margin:0}.paper-dialog>header button{border:0;background:transparent}
.paper-dialog>footer{justify-content:flex-end;border-top:1px solid var(--rule)}.paper-dialog-content{overflow:auto;overscroll-behavior:contain;min-height:0;padding:16px 20px}.paper-dialog-content>:first-child{margin-top:0}.paper-dialog-sub{font-size:13px;color:var(--muted)}
.paper-dialog button{font:inherit;color:var(--ink);background:var(--base);border:1px solid var(--rule);border-radius:6px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.paper-dialog button:disabled{opacity:.5;cursor:default}.paper-dialog button:hover:not(:disabled){background:var(--selected)}.paper-dialog :is(select,option){background:var(--base);color:var(--ink)}
.paper-dialog .chat-export-body{display:flex;flex-direction:column;gap:12px;overflow:auto;overscroll-behavior:contain;min-height:0;flex:1;padding:16px 20px}.paper-dialog .chat-export-body>*{flex:none}.paper-dialog .chat-export-primary{background:var(--accent);color:var(--on-accent,var(--base));border-color:transparent;font-weight:600}.paper-dialog .chat-export-primary:hover:not(:disabled){filter:brightness(1.06);background:var(--accent)}
.paper-dialog.chat-export button[aria-pressed=true]{background:var(--selected);color:var(--ink);border-color:var(--accent);font-weight:600}
`
