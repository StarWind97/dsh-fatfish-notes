import {layoutThemesCss} from './layout-themes.js'
export const appearanceCss=layoutThemesCss+`
.paper-app[data-layout],.paper-dialog[data-layout]{accent-color:var(--accent);color:var(--ink);background:var(--paper)}
.paper-app[data-layout] :is(input,select,textarea){color:var(--ink);background-color:var(--input)}
.paper-app[data-layout] :is(.paper-top,.paper-doc-head,.paper-tools){background:var(--paper)}
.paper-app[data-layout] .paper-row[aria-current=true],.paper-app[data-layout] .paper-row[aria-current=page],.conversation-notes[data-layout] .conversation-note-row[aria-current=true]{background:var(--selected);box-shadow:inset 3px 0 0 var(--accent),0 1px 3px #0000000a;border-color:color-mix(in srgb,var(--accent) 22%,transparent)}
.paper-app[data-layout] :is(.paper-list-title,.paper-picker select){font:600 17px/1.5 "Segoe UI","Microsoft YaHei",sans-serif}
.paper-app[data-layout] .paper-list{padding:16px 12px 0}.paper-app[data-layout] .paper-list-head{margin-bottom:10px}
.paper-app[data-layout] .paper-leaf{font-family:var(--reading-font);font-size:var(--reading-size);line-height:var(--reading-leading)}
.paper-app[data-layout] :is(.paper-reading,.paper-reading .note-markdown,.paper-reading p,.paper-writing .cm-content){font-family:var(--reading-font);font-size:var(--reading-size);line-height:var(--reading-leading)}
.paper-app[data-layout] .paper-reading :is(li,td,th,blockquote,em,strong,a){font-family:inherit}
.paper-app[data-layout] .paper-leaf :is(h1,h2,h3,h4,h5,h6){font-family:var(--heading-font);line-height:1.45;letter-spacing:.01em}
.paper-app[data-layout] .paper-leaf h1{font-size:clamp(25px,3.3cqw,32px);font-weight:650;margin-bottom:12px}
.paper-app[data-layout] .paper-reading :is(h2,h3){margin-top:1.6em;margin-bottom:.65em}
.paper-app[data-layout] .paper-reading p{margin:.8em 0}.paper-app[data-layout] .paper-reading li+li{margin-top:.25em}
.paper-app[data-layout] .paper-reading a{color:var(--accent);text-underline-offset:3px}
.paper-app[data-layout] .paper-summary{background:var(--summary-bg,var(--shelf))}
:is(.paper-app[data-layout],.paper-dialog[data-layout]) .paper-code pre,:is(.paper-app[data-layout],.paper-dialog[data-layout]) .paper-code code{font-family:"Cascadia Code","Cascadia Mono",Consolas,monospace;font-size:var(--code-size);font-weight:var(--code-weight);line-height:1.65;tab-size:4;font-variant-ligatures:none}
:is(.paper-app[data-layout],.paper-dialog[data-layout]) .paper-code{border:1px solid var(--rule);border-radius:10px;background:var(--code-bg,var(--shelf));margin:1em 0;padding:0;overflow:hidden}
:is(.paper-app[data-layout],.paper-dialog[data-layout]) .paper-code>pre{background:transparent;margin:0!important;padding:12px 16px 14px!important;white-space:pre;overflow:auto;overflow-wrap:normal;border-radius:0}
:is(.paper-app[data-code-wrap=true],.paper-dialog[data-code-wrap=true]) .paper-code>pre{white-space:pre-wrap;overflow-wrap:anywhere}
:is(.paper-app[data-layout],.paper-dialog[data-layout]) .note-markdown :not(pre)>code{font-family:"Cascadia Code","Cascadia Mono",Consolas,monospace;font-size:.88em;font-weight:var(--code-weight);font-variant-ligatures:none;padding:.12em .38em;border-radius:5px;background:var(--code-bg,var(--shelf));border:1px solid color-mix(in srgb,var(--rule) 78%,transparent);overflow-wrap:anywhere}
.paper-code-label{font:600 11.5px/1.4 "Cascadia Code",Consolas,"Segoe UI",sans-serif;color:var(--muted);letter-spacing:.02em}
.paper-code span.paper-code-line{display:block;min-height:1.65em;font:inherit;background:transparent;border-radius:0}.paper-code-line:empty:after{content:' '}
:is(.paper-app[data-code-lines=true],.paper-dialog[data-code-lines=true]) .paper-code code{counter-reset:code-line}:is(.paper-app[data-code-lines=true],.paper-dialog[data-code-lines=true]) .paper-code-line:before{counter-increment:code-line;content:counter(code-line);display:inline-block;width:3.5ch;padding-right:1.5ch;text-align:right;color:var(--muted);opacity:.65;user-select:none}
.paper-app[data-layout] .paper-other{background:var(--paper);padding:24px!important}
.paper-note-tabs{position:relative;display:flex;align-items:stretch;flex:none;min-width:0;background:var(--shelf);border-bottom:1px solid var(--rule);padding:4px 8px 0;gap:4px}
.paper-list>.paper-note-tabs{margin-bottom:8px}
.paper-tabs-list{display:flex;gap:6px;min-width:0;flex:0 1 auto}
.paper-note-tab{position:relative;display:flex;align-items:center;flex:0 1 226px;width:226px;min-width:0;min-height:33px;border:1px solid transparent;border-bottom:0;border-radius:7px 7px 0 0;color:var(--muted)}
.paper-note-tab[data-active=true]{color:var(--ink);background:var(--paper);border-color:var(--rule);box-shadow:0 1px var(--paper)}
.paper-note-tab[data-active=false]+.paper-note-tab[data-active=false]::before{content:'';position:absolute;inset-block:8px;inset-inline-start:-4px;border-inline-start:1px solid color-mix(in srgb,var(--muted) 46%,var(--shelf));pointer-events:none}
.paper-note-tab>.paper-menu-row{width:100%}
.paper-note-tab button[role=tab]{display:block;padding:6px 9px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start;font-size:12px;border-radius:6px}
.paper-note-tabs .paper-tab-close{justify-content:center;flex:none;width:24px;height:26px;padding:0;margin-inline-end:3px}
.paper-note-tabs button:focus-visible{outline-offset:-2px}
.paper-note-tabs :is(.paper-tabs-more,.paper-tabs-add){display:inline-flex;flex:none;align-items:center;justify-content:center;align-self:center;gap:4px;height:29px;padding:0 6px}
.paper-note-tabs .paper-tabs-add{width:30px;padding:0}
.paper-note-tabs .paper-tabs-more{min-width:32px}
.paper-tab-announcement{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
:is(.paper-note-tabs,.paper-tabs-overflow) button[type=button]{cursor:default}
:is(.paper-note-tabs,.paper-tabs-overflow) button[data-tab-drag]{-webkit-user-select:none;user-select:none;touch-action:none}
:is(.paper-note-tabs,.paper-tabs-overflow) button[data-dragging]{cursor:grabbing;opacity:.58}
.paper-note-tab[data-tab-drop]::after{content:'';position:absolute;z-index:1;inset-block:3px;border-inline-start:2px solid var(--accent);pointer-events:none}
.paper-note-tab[data-tab-drop=before]::after{inset-inline-start:-4px}.paper-note-tab[data-tab-drop=after]::after{inset-inline-end:-4px}
.paper-tabs-add[data-tab-drop=end]{background:var(--selected);box-shadow:inset 2px 0 var(--accent)}
.paper-note-tabs[data-tab-drop=end]::after{content:'';position:absolute;inset:7px 4px;border-inline-end:2px solid var(--accent);pointer-events:none}
.paper-tabs-overflow button[data-tab-drop=before]{box-shadow:inset 0 2px var(--accent)}
.paper-tabs-overflow button[data-tab-drop=after]{box-shadow:inset 0 -2px var(--accent)}
@media(forced-colors:active){.paper-note-tab[data-active=true]{border-color:Highlight}.paper-note-tab[data-tab-drop]::after{border-color:Highlight}}
.appearance-settings{max-width:980px;margin:0 auto 32px;font:14px/1.6 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink);display:grid;gap:16px}
.appearance-settings>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.appearance-settings h2{font-size:24px;margin:0}.appearance-settings p{color:var(--muted);margin:6px 0 0}
.appearance-card{border:1px solid var(--rule);border-radius:12px;background:var(--shelf);padding:16px 18px;display:grid;gap:14px;min-width:0}
.appearance-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.appearance-card-head h3{margin:0;font-size:14.5px;font-weight:650;color:var(--ink)}.appearance-card-head small{font-size:12px;color:var(--muted)}
.appearance-code-badge{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px!important;font-weight:600;color:var(--accent)!important;background:var(--selected);border:1px solid color-mix(in srgb,var(--accent) 26%,var(--rule));padding:2px 9px;border-radius:999px;line-height:1.4}
.appearance-reading-preset{display:grid;max-width:460px}
.appearance-code-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px}
.appearance-code-meta{font:500 11px/1.4 "Cascadia Code",Consolas,"Segoe UI",sans-serif;color:var(--muted)}
.appearance-code-preview{margin:2px 0 0!important}
.appearance-hint{font-size:12.5px;color:var(--muted);margin:0}
.appearance-font-preview{padding:16px;margin-top:4px;background:var(--paper);border:1px solid var(--rule);border-radius:10px}
.appearance-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px}
.appearance-field{display:flex;flex-direction:column;gap:6px;min-width:0}.appearance-field>span,.appearance-field-label{font-size:12.5px;font-weight:600;color:var(--muted)}
.appearance-settings select{width:100%;padding:7px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)}
.appearance-layouts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.appearance-layouts button{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:10px;padding:12px;text-align:left;background:var(--paper);border:1.5px solid var(--rule);border-radius:11px;color:var(--ink);cursor:pointer;transition:border-color .15s,background .15s}
.appearance-layouts button[aria-pressed=true]{background:var(--selected);border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent)}
.layout-card-text{display:grid;gap:3px}.layout-card-text strong{font-size:13.5px;font-weight:650}.layout-card-text small{font-size:11.5px;color:var(--muted);line-height:1.45}
.layout-glyph{display:flex;width:100%;height:54px;gap:5px;background:var(--shelf);padding:6px;border-radius:7px;border:1px solid var(--rule)}.layout-glyph i{background:var(--selected);flex:1;border-radius:3px}.layout-glyph i:last-child{flex:2.6;background:var(--paper);border:1px solid var(--rule)}.layout-outline{gap:0;padding:0;overflow:hidden}.layout-outline i{border-radius:0;border-right:1px solid var(--rule)}.layout-outline i:last-child{border:0}.layout-soft{gap:7px}.layout-tree i:nth-child(2){display:none}.layout-tree i:first-child{flex:1.2}
.appearance-palettes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media(max-width:720px){.appearance-palettes{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:460px){.appearance-palettes{grid-template-columns:minmax(0,1fr)}}
.appearance-palette-card{display:flex;align-items:center;justify-content:flex-start!important;gap:11px;padding:11px 13px;border-radius:11px;border:1.5px solid var(--rule);background:var(--paper);color:var(--ink);font-size:13px;text-align:left;cursor:pointer;transition:border-color .15s,background .15s}
.appearance-palette-card:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--rule))}
.appearance-palette-card[aria-pressed=true]{border-color:var(--accent);background:var(--selected);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 20%,transparent)}
.palette-card-text{display:grid;gap:2px;min-width:0;text-align:left}.palette-card-text strong{font-size:13.5px;font-weight:650;line-height:1.3;color:var(--ink)}.palette-card-text small{font-size:11.5px;line-height:1.35;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.palette-dots{display:inline-flex;align-items:center;flex:none}.palette-dots i{width:15px;height:15px;border-radius:50%;border:2px solid var(--paper);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 16%,transparent);display:block}.palette-dots i+i{margin-left:-5px}
.paper-segmented{display:inline-grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border-radius:9px;background:color-mix(in srgb,var(--shelf) 70%,var(--rule));border:1px solid var(--rule);gap:2px}
.paper-segmented button{border:0;background:transparent;padding:5px 10px;border-radius:6px;font-size:12.5px;color:var(--muted);font-weight:500;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center;transition:background .15s,color .15s,box-shadow .15s}
.paper-segmented button:hover{color:var(--ink)}
.paper-segmented button[aria-pressed=true]{background:var(--paper);color:var(--ink);font-weight:650;box-shadow:0 1px 3px #00000018}
.paper-segmented-sm{display:inline-flex;align-items:center;background:color-mix(in srgb,var(--shelf) 72%,var(--rule));padding:2px;border-radius:7px;height:28px;box-sizing:border-box}.paper-segmented-sm button{padding:0 7px;font-size:11.5px;height:22px;line-height:22px}.paper-segmented-sm button[aria-pressed=true]{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px #00000016}
.appearance-checks{display:flex;flex-wrap:wrap;gap:18px}.appearance-check{display:flex;align-items:center;gap:7px}.appearance-check input{width:16px;height:16px}
.paper-dialog[data-layout]{--base:var(--paper);font:14px/1.6 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif}.paper-dialog[data-layout] button{background:transparent}.paper-dialog[data-layout] .paper-primary{background:var(--accent);color:var(--on-accent,white)}
.paper-image-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:14px}.paper-export-dialog .paper-material-choices{max-height:230px;overflow:auto}.paper-dialog[data-layout] :is(select,input,textarea){border-color:var(--rule);background:var(--input);color:var(--ink)}
.paper-app[data-layout] .paper-writing .cm-line.paper-code-line{font-family:"Cascadia Code","Cascadia Mono",Consolas,monospace;font-size:var(--code-size);font-weight:var(--code-weight);font-variant-ligatures:none;tab-size:4}
.paper-app[data-layout] .paper-writing .paper-InlineCode{font-family:"Cascadia Code","Cascadia Mono",Consolas,monospace;font-size:var(--code-size);font-weight:var(--code-weight);font-variant-ligatures:none;padding:1px 4px;border-radius:4px;background:var(--code-bg,var(--shelf))}
@container paper (max-width:440px){:is(.appearance-code-fields,.appearance-reading-preset) .paper-segmented button{padding:5px 6px;font-size:11.5px}}
@container paper (max-width:560px){.paper-app[data-layout] .paper-leaf{padding-inline:18px}.paper-app[data-layout] .paper-leaf h1{font-size:25px}.paper-app[data-layout] .paper-other{padding:16px!important}}
.paper-document-tools{display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px!important}.paper-document-tools>button{justify-self:end}.paper-status-materials{justify-self:center}.paper-materials-toggle{display:inline-flex;align-items:center;gap:12px!important;white-space:nowrap}.paper-materials-toggle>span{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums}.paper-materials-toggle [data-empty=true]{color:var(--muted)}
@container document (max-width:440px){.paper-shortcuts-label{display:none}.paper-document-tools{padding-inline:10px!important}.paper-materials-toggle{gap:8px!important}}
.paper-document>.paper-document-body{grid-template-rows:minmax(0,1fr) auto}
.paper-document[data-outline=pinned] .paper-outline{grid-row:1 / 3}
.paper-materials{grid-area:2/1;max-height:var(--materials-limit,240px);z-index:12;min-width:0;min-height:0;background:var(--shelf);border-top:1px solid var(--rule);font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;container:materials / inline-size;display:flex;flex-direction:column;box-shadow:0 -3px 12px #00000006}
.paper-materials[hidden]{display:none}.paper-materials>header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;padding:3px 12px}.paper-materials>header>span{flex:1;color:var(--muted)}.paper-materials>header button{min-height:30px;font-size:12px}
.paper-material-content{padding:8px 14px 14px;overflow:auto;min-height:0;overscroll-behavior:contain}.paper-material-content[hidden]{display:none}
.paper-document[data-material-open=true][data-material-pinned=false] .paper-materials{position:absolute;grid-area:auto;bottom:0;left:0;right:0;box-shadow:0 -8px 30px #00000016;border-radius:10px 10px 0 0}
.paper-document[data-outline=pinned][data-material-pinned=false] .paper-materials{right:calc(var(--outline-size) + 12px)}
.paper-document[data-material-open=true][data-material-pinned=true]>.paper-document-body{grid-template-rows:minmax(0,1fr) auto}
.paper-material-content .paper-supplements{border:0;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:6px 12px}
.paper-material-content .paper-supplements>:is(header,p,.paper-file-progress){grid-column:1 / -1}.paper-material-content .paper-supplement-hint{margin:0!important}
.paper-material-content .paper-supplement-row{margin:0;padding:4px 6px;gap:7px;background:var(--paper);border:1px solid transparent;border-radius:5px;min-width:0}
.paper-file-meta{display:flex;align-items:center;gap:12px;min-width:0!important}.paper-file-meta small{flex:none;white-space:nowrap;margin-left:auto}
.paper-file-name{display:flex;min-width:0;overflow:hidden}.paper-file-name>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.paper-file-suffix{flex:none}
.paper-material-content .paper-backlinks{border:0;margin:12px 0 0;padding-top:8px;border-top:1px solid var(--rule)}.paper-material-content .paper-backlinks>div{display:flex;flex-wrap:wrap;gap:5px}
.paper-materials[data-style=cards] .paper-supplement-row{padding:10px;border-color:var(--rule);border-radius:8px}
@container document (min-width:760px){
 .paper-materials[data-position=right][data-open=true]{max-height:none!important}
 .paper-document[data-material-position=right][data-material-open=true]>.paper-document-body{grid-template-columns:minmax(0,1fr) minmax(240px,300px);grid-template-rows:minmax(0,1fr);padding-right:0;gap:0}
 .paper-document[data-material-position=right][data-material-open=true] .paper-materials{position:relative;grid-area:1/2;inset:auto;border-top:0;border-left:1px solid var(--rule);border-radius:0;box-shadow:none}
 .paper-document[data-material-position=right][data-material-open=true][data-right-style=stack][data-outline=pinned]>.paper-document-body{grid-template-rows:minmax(0,1fr) minmax(0,1fr)}
 .paper-document[data-material-position=right][data-material-open=true][data-right-style=stack] .paper-pane{grid-row:1/3}
 .paper-document[data-material-position=right][data-material-open=true][data-right-style=stack][data-outline=pinned] .paper-materials{grid-area:2/2;border-top:1px solid var(--rule)}
 .paper-document[data-material-position=right][data-material-open=true][data-right-style=stack][data-outline=pinned] .paper-outline{grid-area:1/2;width:auto}
 .paper-document[data-material-position=right][data-material-open=true][data-right-style=tabs] .paper-outline{display:none}
}
@container materials (max-width:340px){.paper-material-content{padding:5px 8px 10px}.paper-file-meta{gap:5px}.paper-supplement-row{gap:5px}.paper-material-content .paper-supplement-row>svg{width:14px}.paper-material-content .paper-supplement-row button,.paper-material-content .paper-supplement-row>a{width:24px}}
`
