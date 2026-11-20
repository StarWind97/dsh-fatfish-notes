export const classificationCss = `
.class-tabs{display:flex;align-items:center;gap:4px;padding:9px 18px;border-bottom:1px solid var(--rule);background:var(--base)}
.class-tabs button,.class-workspace button,.class-workspace select,.class-workspace input:not([type=checkbox]){font:inherit;color:var(--ink);background:var(--base);border:1px solid var(--rule);border-radius:6px;padding:5px 9px;min-width:0}
.class-tabs button,.class-workspace button{cursor:pointer}.class-tabs button{padding:5px 18px;background:transparent;border-color:transparent}
.class-tabs button[aria-pressed=true],.class-workspace button[aria-pressed=true]{background:var(--selected);color:var(--ink);border-color:color-mix(in srgb,var(--accent) 40%,var(--rule))}
.class-workspace button:hover:not(:disabled),.class-tabs button:hover:not(:disabled){background:var(--selected)}
.class-workspace button:disabled{opacity:.45;cursor:default}.class-workspace :focus-visible,.class-tabs button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.paper-workspace-other>.class-tabs+.paper-books-page{height:auto;min-height:0;flex:1}
.class-workspace{min-inline-size:0;min-height:0;flex:1;display:grid;grid-template-columns:clamp(170px,20%,270px) minmax(285px,.88fr) minmax(300px,1.12fr);margin:0;padding:0;border:0;font-size:13px;overflow:hidden}
.class-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.class-workspace>aside,.class-workspace>section{display:flex;flex-direction:column;min-height:0;min-width:0}
.class-directory,.class-center{border-inline-end:1px solid var(--rule)}
.class-directory{background:var(--shelf);padding:14px 10px 0;gap:9px}.class-directory h3{font-size:16px;margin:0 0 2px}.class-directory small,.class-workspace small,.class-workspace footer{color:var(--muted);font-size:12px}
.class-options,.class-facts,.class-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.class-options select{max-width:100%}.class-workspace input[type=search]{width:100%;padding:7px 10px}
.class-tag-rows,.class-rows,.class-paper{overflow:auto;overscroll-behavior:contain;min-height:0;flex:1}
.class-tag-rows button,.class-rows button{display:block;text-align:start;width:100%;padding:8px 10px;background:transparent;border:1px solid transparent}
.class-tag-rows span,.class-tag-rows small,.class-rows button>*{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.class-tag-rows em{font-size:11px;color:var(--accent);font-style:normal}
.class-center{background:var(--base)}.class-context{background:var(--supplement,var(--shelf));padding:14px 16px;border-bottom:1px solid var(--rule);overflow:auto;max-height:52%}
.class-context h2{overflow-wrap:anywhere;font:600 20px/1.35 var(--serif);margin:0 0 6px}
.class-facts{margin-bottom:9px}.class-facts button{font-size:12px;padding:2px 7px}
.class-context p{margin:5px 0}.class-context [role=alert]{color:var(--ink);border-inline-start:3px solid #be7941;padding-inline-start:7px}
.class-action{margin-top:8px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--rule));border-radius:8px;background:var(--base);padding:9px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.class-action p,.class-action .class-options{flex-basis:100%}.class-action input{max-width:95%}
.class-workspace button.class-primary{background:var(--ink);color:var(--base);border-color:var(--ink)}.class-workspace button.class-primary:hover:not(:disabled){background:color-mix(in srgb,var(--ink) 85%,var(--accent))}
.class-search{padding:10px 14px;border-bottom:1px solid var(--rule);display:grid;gap:7px}
.class-search label{display:inline-flex;align-items:center;gap:3px}.class-rows{padding:4px 7px}.class-rows button{padding:9px 10px;border-bottom:1px solid var(--rule);border-radius:4px}
.class-rows span{color:var(--muted);font-size:12px}.class-workspace footer,.class-reader>header{padding:6px 12px;display:flex;align-items:center;gap:7px;border-top:1px solid var(--rule);background:var(--shelf)}
.class-workspace footer span:first-child,.class-reader>header span{margin-inline-end:auto}.class-directory footer{justify-content:center}.class-workspace footer button,.class-reader>header button{padding:2px 8px}
.class-reader>header{border-top:0;border-bottom:1px solid var(--rule);font-weight:600}.class-paper{padding:clamp(15px,2.4cqw,35px);overflow-wrap:anywhere}
.class-paper article{max-width:78ch;margin:auto}.paper-app .class-paper .paper-reading>h2{font:600 clamp(19px,2cqw,29px)/1.4 var(--serif);margin:6px 0 10px}
.class-chips{margin-bottom:14px}.class-chips button{border-radius:16px;font:12px/1.5 "Segoe UI",sans-serif;background:var(--shelf);padding:3px 9px}.class-chips button:last-child{border-style:dashed;background:transparent}
.class-delta{padding:8px 12px;background:var(--supplement,var(--shelf));border-inline-start:2px solid var(--accent)}
@container paper (width < 770px){.class-workspace{display:flex;flex-direction:column;overflow:auto}.class-workspace>aside,.class-workspace>section{flex:none;min-height:auto;border-inline-end:0;border-bottom:1px solid var(--rule)}.class-directory{max-height:255px}.class-center .class-rows{max-height:280px}.class-context{max-height:none}.class-paper{overflow:visible}.class-directory footer{padding:2px}.class-reader{min-height:300px}}
`
