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
.class-workspace button.class-primary{background:var(--accent);color:var(--on-accent,var(--base));border-color:transparent}.class-workspace button.class-primary:hover:not(:disabled){filter:brightness(1.06);background:var(--accent)}
.class-search{padding:10px 14px;border-bottom:1px solid var(--rule);display:grid;gap:7px}
.class-search label{display:inline-flex;align-items:center;gap:3px}.class-rows{padding:4px 7px}.class-rows button{padding:9px 10px;border-bottom:1px solid var(--rule);border-radius:4px}
.class-rows span{color:var(--muted);font-size:12px}.class-workspace footer,.class-reader>header{padding:6px 12px;display:flex;align-items:center;gap:7px;border-top:1px solid var(--rule);background:var(--shelf)}
.class-workspace footer span:first-child,.class-reader>header span{margin-inline-end:auto}.class-directory footer{justify-content:center}.class-workspace footer button,.class-reader>header button{padding:2px 8px}
.class-reader>header{border-top:0;border-bottom:1px solid var(--rule);font-weight:600}.class-paper{padding:clamp(15px,2.4cqw,35px);overflow-wrap:anywhere}
.class-paper article{max-width:78ch;margin:auto}.paper-app .class-paper .paper-reading>h2{font:600 clamp(19px,2cqw,29px)/1.4 var(--serif);margin:6px 0 10px}
.class-chips{margin-bottom:14px}.class-chips button{border-radius:16px;font:12px/1.5 "Segoe UI",sans-serif;background:var(--shelf);padding:3px 9px}.class-chips button:last-child{border-style:dashed;background:transparent}
.class-delta{padding:8px 12px;background:var(--supplement,var(--shelf));border-inline-start:2px solid var(--accent)}

.class-shell{display:flex;flex:1;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
.class-book-panel>.paper-books-page{height:100%;overflow:auto}
.paper-app .class-subhead{background:var(--paper);border-block-end:1px solid var(--rule);flex:none;padding-inline:clamp(16px,2cqw,32px)}.paper-app .class-tabs{display:flex;align-items:stretch;gap:25px;padding:0;background:transparent;border:0}
.paper-app .class-subhead .class-tabs button{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:4px 0;border:0;border-radius:0;box-shadow:none;background:transparent;color:var(--muted);font-family:inherit;font-size:14px;font-weight:500;line-height:1.3}
.paper-app .class-subhead .class-tabs button:is([aria-selected=true],:hover){color:var(--ink);background:transparent}.paper-app .class-tabs button[aria-selected=true]{font-weight:650}.paper-app .class-tabs button[aria-selected=true] svg{color:var(--accent)}.paper-app .class-tabs button[aria-selected=true]::after{content:"";position:absolute;inset:auto 0 0;height:2px;background:var(--accent)}
.paper-app .class-stage-scroll,.paper-app .class-book-panel{min-width:0;min-height:0;flex:1;overflow:auto}.paper-app .class-stage{height:100%;width:100%;min-width:752px;position:relative;display:flex}
.paper-app .class-stage .class-workspace{display:grid;grid-template-columns:var(--dir) var(--mid) minmax(0,1fr);grid-template-rows:minmax(0,1fr);column-gap:var(--panel-gap,0px);align-content:stretch;overflow:hidden}
.paper-app .class-stage .class-workspace>:is(section,aside){min-width:0;min-height:0;max-height:none;display:flex;flex-direction:column;overflow:hidden}
.class-shell{--row-pad:8px;--panel-pad:15px;--radius:6px}.paper-app[data-density=compact] .class-shell{--row-pad:5px;--panel-pad:12px}.paper-app[data-density=spacious] .class-shell{--row-pad:12px;--panel-pad:20px}
.paper-app .class-workspace .class-directory{padding:var(--panel-pad) 10px 0;gap:8px}
.paper-app .class-directory>h3{font-size:15px;line-height:1.5;color:var(--ink);padding:0 2px}
.paper-app .class-directory>.class-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.paper-app .class-directory>.class-options select{font-size:12px;padding:4px 1px}.paper-app .class-directory>.class-options select:only-child{grid-column:1/-1}
.paper-app .class-directory>small{padding-inline:3px}.paper-app .class-workspace .class-tag-rows button{padding:var(--row-pad) 9px;border:1px solid transparent;border-radius:var(--radius);line-height:1.5;margin:1px 0}
.paper-app .class-tag-rows button[aria-pressed=true] span{font-weight:650}.paper-app .class-workspace .class-tag-rows button[aria-pressed=true]{background:var(--selected);box-shadow:inset 2px 0 var(--accent)}
.paper-app .class-context{padding:var(--panel-pad);background:var(--shelf);flex:0 1 auto;max-height:55%;border-block-end:1px solid var(--rule)}
.paper-app .class-context h2{margin:0 0 5px;font:650 clamp(18px,1.55cqw,24px)/1.4 var(--heading-font);overflow-wrap:anywhere}
.paper-app .class-context>.class-options button{padding:4px 8px;font-size:12px;min-height:27px;background:var(--paper)}
.paper-app .class-context>.class-options button:hover{background:var(--selected)}.paper-app .class-context .class-facts{color:var(--muted);font-size:12px;gap:5px 9px}
.paper-app .class-workspace .class-search{padding:10px var(--panel-pad)}.paper-app .class-workspace input:not([type=checkbox]),.paper-app .class-workspace select{background:var(--input)}
.paper-app .class-rows{padding:3px 8px;max-height:none}.paper-app .class-rows button{padding:calc(var(--row-pad) + 2px) 10px;border-radius:var(--radius);line-height:1.55}.paper-app .class-rows button strong{font-size:14px;font-weight:600}.paper-app .class-rows button small{margin-top:2px}
.paper-app .class-rows button[aria-pressed=true]{border-color:transparent;background:var(--selected);box-shadow:inset 2px 0 var(--accent)}
.paper-app .class-reader>header{height:39px;flex:none;font-size:12px}.paper-app .class-stage .class-paper{padding:clamp(20px,3cqw,54px) clamp(19px,3.9cqw,74px);overflow:auto}
.paper-app .class-reader{background:var(--paper)}.paper-app .class-paper .paper-reading{max-width:48em;margin:auto}.paper-app .class-paper .paper-reading>small{color:var(--muted)}
.paper-app .class-paper .paper-reading>h2{font:650 clamp(24px,2.25cqw,35px)/1.4 var(--heading-font);margin:9px 0 14px;letter-spacing:0}
.paper-app .class-paper .note-markdown img{display:block;max-height:450px!important;border-radius:var(--radius)}.paper-app .class-reader .class-chips button{font-family:inherit}
.paper-app .class-workspace .class-tag-rows,.paper-app .class-workspace .class-rows,.paper-app .class-workspace .class-paper{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--muted) 33%,transparent) transparent}
.paper-app .class-workspace footer{flex:none;padding-block:5px;line-height:20px}.paper-app .class-workspace footer,.paper-app .class-reader header{color:var(--muted)}
.class-grip{position:absolute;z-index:2;inset-block:0;width:max(11px,var(--gap));transform:translateX(-50%);cursor:col-resize;touch-action:none}
.class-grip:after{content:"";position:absolute;left:50%;inset-block:0;transform:translateX(-50%);width:2px;background:transparent}.class-grip:is(:hover,:focus-visible,[data-active]):after{background:var(--accent)}
.paper-app .class-grip:focus-visible{outline:0}.grip-0{left:calc(var(--dir) + var(--gap) / 2)}.grip-1{left:calc(var(--dir) + var(--mid) + var(--gap) * 1.5)}
.paper-app[data-layout=soft] .class-shell{gap:var(--panel-pad)}.paper-app[data-layout=soft] .class-stage .class-workspace{background:var(--shelf)}
.paper-app[data-layout=soft] .class-subhead{border:0;background:transparent}
.paper-app[data-layout=tree] .class-tag-rows{margin-inline-start:6px;border-inline-start:1px solid var(--rule);padding-inline-start:7px}.paper-app[data-layout=tree] .class-workspace .class-tag-rows button{padding-block:calc(var(--row-pad) * .68)}
.paper-app .class-stage .class-paper article.paper-reading>h2{margin-block:8px 13px}.paper-app .class-stage .class-paper .paper-summary p{margin:.45em 0}.paper-app .class-directory .class-tag-rows{scroll-padding:8px}

.paper-app .class-rows button.class-load-more{width:auto;text-align:center;padding:6px 10px;margin:6px 0;border:0;background:transparent;color:var(--ink);overflow-anchor:none}.paper-app .class-rows button.class-load-more:hover{background:var(--selected)}

/* The operation, its consequence, and the list of notes have distinct reading levels. */

.paper-app .class-center[data-reviewing=true] .class-context{padding:0;max-height:54%;flex-shrink:0;overflow:auto;background:var(--shelf)}
.paper-app .class-context .operation{display:grid;align-items:stretch;row-gap:7px;margin:0;padding:10px var(--panel-pad) 9px;border:0;border-radius:0;background:transparent;color:var(--ink)}
.paper-app .op-heading{display:flex;align-items:center;gap:7px;margin:0;color:var(--accent)}
.paper-app .op-heading h2{margin:0;line-height:1.45;font-family:inherit;font-size:14px;font-weight:650;letter-spacing:0;color:var(--ink)}
:where(.class-workspace) .op-names{display:grid;grid-template-columns:minmax(0,1fr) 25px minmax(0,1fr);gap:5px;align-items:stretch}
:where(.class-workspace) .op-names[data-single=true]{grid-template-columns:minmax(0,1fr)}
:where(.class-workspace) .op-field{display:flex;flex-direction:column;justify-content:center;min-width:0;gap:1px;border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper);padding:6px 9px}
:where(.class-workspace) .op-field>small,.paper-app .op-field>small{color:var(--muted);font-size:11px;line-height:1.4}
:where(.class-workspace) .op-field strong,.paper-app .class-action .op-field input{color:var(--ink);font:650 clamp(16px,1.35vw,22px)/1.45 var(--heading-font);overflow-wrap:anywhere}
:where(.class-workspace) .op-field strong i{color:var(--accent);font-size:.82em;font-style:normal;margin-right:3px}
:where(.class-workspace) .op-field:last-child:not(:first-child){border-inline-start:2px solid var(--accent)}
.paper-app .class-action .op-field input{max-width:100%;width:100%;padding:0 3px;border:0;border-bottom:1px solid var(--rule);border-radius:0;background:var(--input)}
:where(.class-workspace) .op-direction{display:grid;place-items:center;color:var(--muted)}
.paper-app .operation .op-direction button{padding:4px;border:0;border-radius:var(--radius);color:var(--accent);background:transparent;display:grid;place-items:center}
.paper-app .operation .op-direction button:hover{background:var(--selected)}
.paper-app .operation .pick-target{padding:2px 0;border:0;background:transparent;color:var(--accent);justify-content:flex-start;display:inline-flex;align-items:center;gap:4px;text-align:start}
:where(.class-workspace) .op-impact-line{display:flex;align-items:baseline;gap:6px 10px;flex-wrap:wrap;font-size:12px}:where(.class-workspace) .op-impact-line>span:first-child{color:var(--muted)}
:where(.class-workspace) .op-impact-line strong{line-height:1.4;font-size:18px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--ink)}.paper-app .op-impact-line strong small{font-size:12px;font-weight:500;color:var(--ink)}
:where(.class-workspace) .impact-rule{height:11px;align-self:center;width:1px;background:var(--rule)}:where(.class-workspace) .merge-result{font-size:12px;color:var(--muted);margin-top:2px}:where(.class-workspace) .merge-result b{color:var(--ink)}
.paper-app .operation .op-consequence{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.5;margin:0;color:var(--ink)}
.paper-app .op-consequence svg{flex:none;color:var(--accent)}
:where(.class-workspace) .op-buttons{display:flex;align-items:center;justify-content:flex-end;gap:7px}
.paper-app .operation .op-buttons button{padding:4px 10px;font-size:12px;min-height:28px}
.paper-app .operation .op-buttons .class-primary{background:var(--accent);color:var(--on-accent,var(--paper));border-color:transparent}
.paper-app .operation .op-buttons .class-primary:disabled{opacity:.46}
.paper-app .class-rows[role=tabpanel]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.paper-app .class-context .check-similar{color:var(--accent);display:inline-flex;align-items:center;gap:4px}
.paper-app .class-directory .match-reason{display:inline-block;max-width:100%;border-radius:3px;background:var(--selected);color:var(--ink);padding:1px 5px;line-height:1.5;font-size:11px}
.paper-app .class-tag-rows button[data-similar=true]>span{font-weight:650}
/* Keep the two decisions readable at the actual, draggable column width. */
:where(.class-workspace) .op-decision{display:flex;flex-wrap:wrap;align-items:center;gap:4px 9px;padding:6px 8px 6px 10px;border-inline-start:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--paper))}
:where(.class-workspace) .op-decision .op-impact{flex:1 1 188px;min-width:0}
:where(.class-workspace) .op-decision .op-buttons{flex:none;margin-inline-start:auto}
.paper-app .operation .op-buttons button:first-child{background:transparent;border-color:transparent;color:var(--muted)}
.paper-app .operation .op-buttons button:first-child:hover{background:var(--selected);color:var(--ink)}
.paper-app .class-center[data-reviewing=true] .class-search{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:9px var(--panel-pad) 7px;border-bottom:0}
.paper-app .class-center[data-reviewing=true] .class-search>input[type=search]{flex:1 1 142px;min-width:min(142px,100%);width:auto;height:32px}
.paper-app .class-center[data-reviewing=true] .list-tools{flex:0 1 auto;gap:5px;max-width:100%}
.paper-app .class-center[data-reviewing=true] .list-tools>*{min-height:30px}
.paper-app .class-center[data-reviewing=true] .extra-filters{flex:1 0 100%;margin-top:2px}
:where(.class-workspace) .linked-scope{flex:none;padding:0 var(--panel-pad);background:var(--paper);border-bottom:1px solid var(--rule)}
:where(.class-workspace) .scope-tabs{display:flex;gap:6px;align-items:stretch}
.paper-app .scope-tabs button{min-width:0;flex:1 1 0;display:grid;grid-template-columns:max-content minmax(0,max-content) max-content;align-items:baseline;align-content:center;justify-content:start;gap:4px;text-align:start;padding:6px 7px;min-height:33px;line-height:1.4;color:var(--muted);background:transparent;border:0;border-bottom:2px solid transparent;border-radius:var(--radius) var(--radius) 0 0}
.paper-app .scope-tabs button:only-child{flex:0 1 auto}
.paper-app .scope-tabs button span{flex:none;font-size:11px;color:var(--muted)}.paper-app .scope-tabs button strong{font-size:13px;font-family:inherit;font-weight:600;min-width:0;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.paper-app .scope-tabs button b{font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;color:var(--muted);background:var(--shelf);padding:1px 4px;border-radius:3px}
.paper-app .scope-tabs button[aria-selected=true]{color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--paper));border-bottom-color:var(--accent)}

.paper-app .class-center[data-reviewing=true] .class-rows{border-inline-start:2px solid color-mix(in srgb,var(--accent) 45%,var(--rule))}
@media(max-width:1040px){.op-names{gap:3px;grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr)}:where(.class-workspace) .op-field{padding:5px}:where(.class-workspace) .op-impact-line{gap:4px 6px}.paper-app .op-field strong,.paper-app .class-action .op-field input{font-size:15px}.paper-app .class-context .operation{row-gap:7px}}
@media(max-height:650px){.paper-app .class-context .operation{row-gap:5px;padding-block:6px}.paper-app .linked-scope{padding-top:3px}.paper-app .op-field{padding-block:3px}}

.paper-app .class-paper .note-impact{margin:12px 0 16px;padding:8px 12px;background:color-mix(in srgb,var(--accent) 6%,var(--paper));border-inline-start:3px solid var(--accent);display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-family:inherit;font-size:13px;line-height:1.5}
.paper-app .note-impact>div{display:flex;align-items:center;gap:5px}.paper-app .note-impact>div:first-child{color:var(--accent)}.paper-app .class-paper .note-impact p,.paper-app .class-paper .note-impact small{font-family:inherit;font-size:12px;line-height:1.5;margin:0;color:var(--muted)}
.paper-app .class-paper .note-impact small{flex-basis:100%}:where(.class-workspace) .delta-path{overflow-wrap:anywhere}:where(.class-workspace) .delta-path span{background:var(--shelf);color:var(--ink);border:1px solid var(--rule);border-radius:var(--radius);padding:1px 5px}:where(.class-workspace) .delta-path .old-name{text-decoration:line-through}:where(.class-workspace) .delta-path .new-name{background:var(--selected);font-weight:600}

`
