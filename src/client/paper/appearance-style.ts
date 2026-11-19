import {layoutThemesCss} from './layout-themes.js'
export const appearanceCss=layoutThemesCss+`
.paper-app[data-layout],.paper-dialog[data-layout]{accent-color:var(--accent);color:var(--ink);background:var(--paper)}
.paper-app[data-layout] :is(input,select,textarea){color:var(--ink);background-color:var(--input)}
.paper-app[data-layout] :is(.paper-top,.paper-doc-head,.paper-tools){background:var(--paper)}
.paper-app[data-layout] .paper-row[aria-current=true],.paper-app[data-layout] .paper-row[aria-current=page],.conversation-notes[data-layout] .conversation-note-row[aria-current=true]{background:var(--selected);box-shadow:0 1px 3px #0000000a;border-color:transparent}
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
.paper-app[data-layout] .paper-summary{border-left:3px solid var(--accent);border-radius:0 8px 8px 0;background:var(--shelf)}
.paper-app[data-layout] .paper-code pre,.paper-app[data-layout] .paper-code code{font-family:"Cascadia Code","Cascadia Mono",Consolas,monospace;font-size:var(--code-size);font-weight:var(--code-weight);line-height:1.65;tab-size:4;font-variant-ligatures:none}
.paper-app[data-layout] .paper-code{border:1px solid var(--rule);border-radius:8px;background:var(--shelf);margin:1em 0;padding:0;overflow:hidden}
.paper-app[data-layout] .paper-code>pre{background:transparent;margin:0!important;padding:36px 16px 14px!important;white-space:pre;overflow:auto;overflow-wrap:normal;border-radius:0}
.paper-app[data-code-wrap=true] .paper-code>pre{white-space:pre-wrap;overflow-wrap:anywhere}
.paper-code-label{position:absolute;top:7px;left:14px;font:11px/1.5 "Segoe UI",sans-serif;color:var(--muted)}
.paper-code span.paper-code-line{display:block;min-height:1.65em;font:inherit;background:transparent;border-radius:0}.paper-code-line:empty:after{content:' '}
.paper-app[data-code-lines=true] .paper-code code{counter-reset:code-line}.paper-app[data-code-lines=true] .paper-code-line:before{counter-increment:code-line;content:counter(code-line);display:inline-block;width:3.5ch;padding-right:1.5ch;text-align:right;color:var(--muted);opacity:.65;user-select:none}
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
:is(.paper-note-tabs,.paper-tabs-overflow) button[data-tab-drag]{cursor:grab;-webkit-user-select:none;user-select:none;touch-action:none}
:is(.paper-note-tabs,.paper-tabs-overflow) button[data-dragging]{cursor:grabbing;opacity:.58}
.paper-note-tab[data-tab-drop]::after{content:'';position:absolute;z-index:1;inset-block:3px;border-inline-start:2px solid var(--accent);pointer-events:none}
.paper-note-tab[data-tab-drop=before]::after{inset-inline-start:-4px}.paper-note-tab[data-tab-drop=after]::after{inset-inline-end:-4px}
.paper-tabs-add[data-tab-drop=end]{background:var(--selected);box-shadow:inset 2px 0 var(--accent)}
.paper-note-tabs[data-tab-drop=end]::after{content:'';position:absolute;inset:7px 4px;border-inline-end:2px solid var(--accent);pointer-events:none}
.paper-tabs-overflow button[data-tab-drop=before]{box-shadow:inset 0 2px var(--accent)}
.paper-tabs-overflow button[data-tab-drop=after]{box-shadow:inset 0 -2px var(--accent)}
@media(forced-colors:active){.paper-note-tab[data-active=true]{border-color:Highlight}.paper-note-tab[data-tab-drop]::after{border-color:Highlight}}
.appearance-settings{max-width:980px;margin:0 auto 32px;font:14px/1.6 "Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink)}
.appearance-settings>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.appearance-settings h2{font-size:24px;margin:0}.appearance-settings p{color:var(--muted);margin:6px 0 18px}
.appearance-font-preview{padding:18px;margin-top:16px;background:var(--shelf);border-radius:8px}.appearance-settings fieldset{border:1px solid var(--rule);border-radius:10px;padding:16px;margin:12px 0 20px;min-width:0}.appearance-settings legend{font-weight:600;padding:0 6px}
.appearance-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:16px}.appearance-fields label{display:flex;flex-direction:column;gap:7px}.appearance-settings select{width:100%;padding:7px;border:1px solid var(--rule);border-radius:6px}
.appearance-layouts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:9px}.appearance-layouts button{display:flex;flex-direction:column;gap:10px;padding:12px;text-align:left;background:var(--paper);border:1px solid var(--rule);border-radius:7px;color:var(--ink);cursor:pointer}.appearance-layouts button[aria-pressed=true]{background:var(--selected);border-color:var(--accent)}.appearance-layouts small{color:var(--muted)}
.layout-glyph{display:flex;width:100%;height:52px;gap:4px;background:var(--shelf);padding:5px;border-radius:4px}.layout-glyph i{background:var(--selected);flex:1;border-radius:2px}.layout-glyph i:last-child{flex:3;background:var(--paper)}.layout-ribbon{border-top:8px solid var(--accent)}.layout-dock i:first-child{flex:.25;background:var(--accent)}.layout-tree i:nth-child(2){display:none}.layout-island{border-bottom:6px solid var(--accent);gap:7px}.layout-soft{gap:7px}.layout-ink{border-bottom:1px solid var(--ink)}.layout-archive i:first-child{background:var(--accent);flex:.3}
.appearance-checks{display:flex;flex-wrap:wrap;gap:20px;margin-top:14px}.appearance-check{display:flex;align-items:center;gap:7px}.appearance-check input{width:16px;height:16px}
.paper-dialog[data-layout]{--base:var(--paper);width:min(680px,calc(100vw - 32px));max-height:calc(100dvh - 32px);font:14px/1.6 "Segoe UI","Microsoft YaHei",sans-serif}.paper-dialog[data-layout] button{background:transparent}.paper-dialog[data-layout] .paper-primary{background:var(--accent);color:white}
.paper-image-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:14px}.paper-export-dialog .paper-material-choices{max-height:230px;overflow:auto}.paper-dialog[data-layout] :is(select,input,textarea){border-color:var(--rule);background:var(--input);color:var(--ink)}
.paper-app[data-layout] .paper-writing .cm-line.paper-code-line{font-family:"Cascadia Code",Consolas,monospace;font-size:var(--code-size);font-weight:var(--code-weight);tab-size:4}
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
