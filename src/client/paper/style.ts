import {experienceCss} from './experience-style.js'
export const paperCss = `
.paper-list-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px}.paper-list-tools .paper-order,.paper-list-tools .paper-quick-view{margin:0;min-width:0}.paper-list-tools .paper-order select{max-width:120px}.paper-list-tools .paper-batch{margin-left:auto;padding:0;gap:4px}.paper-list-tools[data-selecting=true] .paper-batch{flex-basis:100%;margin-left:0;padding-top:5px}.paper-list .paper-rows>.paper-date:first-child{margin-top:6px}.paper-reuse-fields label:has(input[type=radio]),.paper-reuse-fields label:has(input[type=checkbox]){display:flex;align-items:center;gap:8px}.paper-reuse-fields input:is([type=radio],[type=checkbox]){width:16px;height:16px;flex:none;padding:0;margin:0}

.paper-list-controls{flex:none;background:var(--shelf);padding:0 6px 6px 0;max-height:55%;overflow:auto}.paper-list-controls .paper-list-head{padding-top:0}.paper-list .paper-list-scroll{padding-top:0!important}.paper-list .paper-select-row>.paper-menu-row{flex:1;min-width:0}.paper-list .paper-menu-row>.paper-row-more{position:absolute;right:5px;top:7px;margin:0;transform:none}.paper-row-meta{display:inline;font-size:10px!important}.paper-list .paper-row{padding-block:9px!important}.paper-notebook-nav>p{margin:12px 0 5px!important}.paper-notebook-nav nav button{padding-block:6px!important}.paper-notebook-nav [data-note-book=true]{box-shadow:inset 2px 0 var(--accent);border-radius:6px;background:var(--shelf)}.paper-notebook-nav .paper-menu-row>button:first-of-type{width:auto;min-width:0}.paper-notebook-nav .paper-menu-row>button.paper-row-more{width:25px;padding:4px!important}.paper-notebook-nav nav [data-note-book=true] .paper-notebook-name{font-weight:600}

.paper-code{position:relative}.paper-code-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;border-bottom:1px solid var(--rule);background:color-mix(in srgb,var(--shelf) 72%,var(--code-bg,var(--shelf)))}.paper-code>pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:12px 14px!important;border-radius:0 0 8px 8px;background:var(--code-bg,var(--dsw-alias-bg-layer-2,var(--shelf)))}.paper-code button.paper-copy-code{display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:6px;padding:3px 6px;font:12px/1.35 "Segoe UI","Microsoft YaHei",sans-serif;background:transparent;color:var(--muted);opacity:.88;cursor:pointer;transition:background .15s,color .15s,border-color .15s,opacity .15s}.paper-code button.paper-copy-code:hover,.paper-code button.paper-copy-code:focus-visible{opacity:1;color:var(--ink);background:var(--selected)}.paper-code button.paper-copy-code[data-state=copied]{opacity:1;padding:3px 9px;background:var(--success-soft,light-dark(#e6f6ec,rgba(92,214,141,.18)));color:var(--success,light-dark(#18794e,#6ee7a8));border-color:color-mix(in srgb,var(--success,light-dark(#18794e,#6ee7a8)) 38%,transparent);font-weight:600}.paper-code button.paper-copy-code[data-state=failed]{opacity:1;padding:3px 9px;background:var(--danger-soft,light-dark(#fef2f2,rgba(252,129,129,.18)));color:var(--danger,light-dark(#c53030,#fc8181));border-color:color-mix(in srgb,var(--danger,light-dark(#c53030,#fc8181)) 38%,transparent);font-weight:600}.paper-code>small{display:block;padding-right:30px}

.paper-trash-action{position:relative;display:flex}.paper-trash-icon{width:30px;height:30px;justify-content:center!important}.paper-trash-confirm{position:absolute;right:0;top:calc(100% + 7px);z-index:45;width:230px;max-width:calc(100vw - 40px);padding:15px 16px;border:1px solid var(--rule);border-radius:10px;background:var(--base);box-shadow:0 8px 28px #0002;font:13px/1.6 "Segoe UI","Microsoft YaHei",sans-serif}.paper-trash-confirm strong{font-weight:600}.paper-trash-confirm p{margin:5px 0 14px;color:var(--muted)}.paper-trash-confirm footer{display:flex;justify-content:flex-end;gap:8px}.paper-trash-confirm .paper-trash-accept{background:var(--selected)}

.paper-app{--ink:var(--dsw-alias-label-primary);--muted:var(--dsw-alias-label-secondary);--base:var(--dsw-alias-bg-layer-1);--rule:var(--dsw-alias-border-l2);--paper:color-mix(in srgb,var(--base) 96%,#b39769);--shelf:color-mix(in srgb,var(--base) 91%,#a88a59);--selected:color-mix(in srgb,var(--base) 79%,#a07f4e);--accent:color-mix(in srgb,var(--ink) 53%,#b67644);--serif:"Songti SC","Noto Serif CJK SC",SimSun,Georgia,serif;container:paper / inline-size;display:flex;flex-direction:column;min-width:0;height:100%;min-height:0;color:var(--ink);background:var(--paper);font:14px/1.6 "Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif}
.paper-tags{display:flex;align-items:center;flex-wrap:wrap;gap:6px;max-width:100%}.paper-tags button{max-width:100%;overflow-wrap:anywhere;color:var(--ink);font-size:12px;padding:2px 10px!important;border-radius:999px!important;border:1px solid var(--rule)!important;background:var(--shelf)}.paper-tags button[aria-pressed=true]{background:var(--selected);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 36%,transparent)!important;font-weight:600}
.paper-stamp{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.paper-list button.paper-filter-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin-top:8px;padding:2px 8px;background:var(--selected);color:var(--ink);font-size:12px}.paper-filter-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.paper-filter-chip svg{flex:none}
@container leaf (max-width:440px){.paper-meta>.paper-tags{flex-basis:100%}}
.paper-app *{box-sizing:border-box}.paper-app :is(button,input,select,textarea){font:inherit}
:where(.paper-app .paper-top,.paper-app .paper-list,.paper-app .paper-detail,.paper-notebook-nav) button{display:inline-flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;color:inherit;border:0;background:transparent;padding:5px 8px;border-radius:6px}
.paper-app :is(.paper-top,.paper-list,.paper-detail,.paper-notebook-nav) button:hover{background:var(--selected)}.paper-app button:disabled{cursor:default;opacity:.55}
.paper-app :is(button,input,select,textarea,[tabindex]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.paper-top{position:relative;z-index:35;display:flex;align-items:center;gap:clamp(10px,2cqw,28px);padding:0 clamp(14px,2.5cqw,40px);min-height:56px;flex:none;background:var(--base);border-bottom:1px solid var(--rule);white-space:nowrap}
.paper-top>strong,.paper-book,.paper-actions,.paper-meta{display:flex;align-items:center;gap:8px}.paper-top>strong{font-size:16px}.paper-top>strong svg,.paper-book{color:var(--accent)}
.paper-top nav{display:flex;align-self:stretch;gap:9px}.paper-top nav button{font-weight:600;padding-inline:3px;border-radius:0;border-bottom:2px solid transparent;color:var(--muted)}.paper-top nav button[aria-pressed=true]{border-color:var(--accent);font-weight:600;color:var(--ink)}
.paper-top-actions{margin-inline-start:auto;display:flex;align-items:center;gap:clamp(6px,1.2cqw,12px);min-width:0}
.paper-width{display:inline-flex;gap:2px;align-items:center;background:color-mix(in srgb,var(--shelf) 72%,var(--rule));border:1px solid var(--rule);padding:2px;border-radius:8px;height:29px;box-sizing:border-box}.paper-top .paper-width button{padding:0 8px;height:23px;line-height:23px;font-size:12px;color:var(--muted);border-radius:6px;transition:background .15s,color .15s,box-shadow .15s}.paper-top .paper-width button:hover{color:var(--ink)}.paper-width [aria-pressed=true]{background:var(--paper)!important;color:var(--ink)!important;font-weight:650;box-shadow:0 1px 2px #00000018}
.paper-sync-status{display:inline-flex;align-items:center;gap:6px;border:1px solid transparent!important;background:transparent!important;padding:4px 8px!important;border-radius:999px!important;font-size:12px!important;white-space:nowrap}.paper-sync-status[data-state=synced]{background:var(--success-soft,light-dark(#eaf6ef,rgba(92,214,141,.14)))!important;color:var(--success,light-dark(#1d8348,#6ee7a8))!important;border-color:color-mix(in srgb,var(--success,light-dark(#1d8348,#6ee7a8)) 24%,transparent)!important}.paper-sync-status[data-state=synced] svg{color:currentColor}.paper-sync-status[data-state=syncing] svg{animation:paper-sync-spin 1s linear infinite}.paper-sync-status[data-state=error]{color:var(--danger,light-dark(#c53030,#fc8181));background:var(--danger-soft,light-dark(#fef2f2,rgba(252,129,129,.14)))!important}@keyframes paper-sync-spin{to{transform:rotate(360deg)}}
.paper-backup{font-size:12px;max-width:260px;overflow:visible}.paper-backup:has([data-attention=true]){max-width:340px}.paper-backup p{margin:0;font-size:12px!important;white-space:normal}
.paper-split{display:grid;min-height:0;flex:1;grid-template-rows:minmax(0,1fr)}.paper-list,.paper-pane,.paper-other{min-width:0;min-height:0;overflow:auto;scrollbar-width:thin}.paper-other{flex:1}
.paper-split[hidden]{display:none}
.paper-split> :nth-child(1){grid-column:1}.paper-split> :nth-child(2){grid-column:2}.paper-split> :nth-child(3){grid-column:3}.paper-split> :nth-child(4){grid-column:4}.paper-split> :nth-child(5){grid-column:5}.paper-split>*{grid-row:1}
.paper-notebook-nav{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--base);border-right:1px solid var(--rule);padding:20px 10px 12px;font-size:13px}
.paper-notebook-nav[hidden],.paper-divider[hidden]{display:none}
.paper-notebook-nav header{display:flex;align-items:center;justify-content:space-between;padding:0 6px 16px;font-size:12px;color:var(--muted)}
.paper-notebook-nav>p{margin:24px 8px 8px;font-size:11px;color:var(--muted)}
.paper-notebook-nav nav{min-height:0;overflow:auto;scrollbar-width:thin;overscroll-behavior:contain;flex:1}
.paper-notebook-nav button{width:100%;justify-content:flex-start;padding:9px 8px;gap:8px;text-align:left;min-width:0}.paper-notebook-nav header button{width:auto;padding:4px}
.paper-notebook-nav svg{flex:none;color:var(--muted)}.paper-notebook-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.paper-notebook-nav small{margin-left:auto;font-size:11px;color:var(--muted)}.paper-notebook-nav [aria-current=page]{background:var(--selected);font-weight:600;color:var(--accent)}
.paper-default-badge{font-size:10px;color:var(--muted);border:1px solid var(--rule);border-radius:4px;padding:0 3px;white-space:nowrap}
.paper-notebook-nav footer{padding-top:16px;flex:none}.paper-notebook-nav footer button{color:var(--muted);font-size:12px}
.paper-list-title{font:650 25px/1.4 var(--serif);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.paper-list-head>button:last-child,.paper-list-head>.paper-new-actions{margin-left:auto;flex:none}.paper-new-btn{padding:5px 11px!important;border-radius:8px!important;background:var(--accent)!important;color:var(--on-accent,#ffffff)!important;font-size:12.5px;font-weight:600;line-height:1.3;box-shadow:0 1px 2px #0000001a;transition:filter .15s}.paper-new-btn:hover:not(:disabled){filter:brightness(1.08);background:var(--accent)!important;color:var(--on-accent,#ffffff)!important}.paper-actions .paper-action-primary{background:var(--selected);color:var(--accent);font-weight:600}.paper-actions .paper-action-primary:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 18%,var(--paper));color:var(--accent)}.paper-expand-notebooks{flex:none}.paper-app .paper-books-toggle{display:inline-flex;flex:none;align-items:center;justify-content:center;width:30px;min-width:30px;height:30px;padding:5px;background:var(--shelf);color:var(--ink);border-radius:6px}.paper-app .paper-books-toggle svg{color:inherit}.paper-app .paper-books-toggle:hover{background:var(--selected);color:var(--accent)}
.paper-detail{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}.paper-detail>p[role=status]{position:absolute;bottom:4px;left:20px;z-index:10;background:var(--paper)}
.paper-list{border-right:1px solid var(--rule);padding:22px clamp(12px,1.7cqw,24px);background:var(--shelf)}.paper-list-head{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:15px}
.paper-picker{position:relative;min-width:0;display:inline-grid;max-width:calc(100% - 32px)}.paper-picker select{appearance:none;field-sizing:content;min-width:0;max-width:100%;padding:2px 24px 2px 0;border:0;color:var(--ink);background:transparent;font:650 25px/1.4 var(--serif);text-overflow:ellipsis;cursor:pointer}.paper-picker svg{position:absolute;right:5px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}.paper-picker option{color:CanvasText;background:Canvas;font:14px sans-serif}
.paper-search{display:flex;align-items:center;gap:6px;padding:3px 6px 3px 10px;background:var(--base);border:1px solid var(--rule);border-radius:6px;color:var(--muted)}
.paper-search input{min-width:0;width:100%;background:transparent;border:0;color:var(--ink);outline:none}.paper-controls,.paper-inset,.paper-link-form{padding:12px;margin:9px 0;background:var(--base);border:1px solid var(--rule);border-radius:7px}
.paper-app input,.paper-app textarea,.paper-app select{color:var(--ink)}
.paper-date{font-size:12px;color:var(--muted);margin:19px 7px 4px}.paper-list .paper-row{width:100%;display:block;text-align:start;border-radius:0;padding:12px 9px;border-bottom:1px solid var(--rule);overflow-wrap:anywhere}
.paper-list .paper-row[aria-current=true]{background:var(--selected);box-shadow:inset 3px 0 0 var(--accent);border-radius:5px}.paper-row strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.paper-row strong svg{margin-inline-end:4px;vertical-align:-2px;color:var(--accent)}.paper-row span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted);font-size:13px;line-height:1.6;margin:4px 0}.paper-row small,.paper-meta,.paper-hint{color:var(--muted);font-size:12px}
.paper-divider{z-index:1;width:12px;margin-left:-6px;position:relative;cursor:col-resize;touch-action:none;user-select:none}.paper-divider:after{content:"";position:absolute;left:4px;top:45%;width:4px;height:30px;background:var(--muted);border-radius:8px;opacity:.45}.paper-divider:hover:after,.paper-divider:focus-visible:after{background:var(--accent);opacity:1}
.paper-pane{--paper-top-gap:8px;padding:var(--paper-top-gap) clamp(18px,2.5cqw,40px) 56px}.paper-leaf{max-width:740px;margin:0 auto;overflow-wrap:anywhere}.paper-app[data-full=true] .paper-pane{padding-inline:clamp(12px,1.6cqw,24px)}.paper-app[data-full=true] .paper-leaf{max-width:none}
.paper-doc-head,.paper-formatbar{display:flex;align-items:center;justify-content:space-between;gap:6px}.paper-doc-head{margin-bottom:20px;min-height:32px}.paper-book{font-size:12px;font-weight:650}.paper-actions{gap:3px;flex-wrap:wrap}.paper-actions button{font-size:13px}.paper-actions .paper-attach{color:var(--accent);border:1px solid var(--rule)}
.paper-leaf h1:not(.note-markdown h1),.paper-title-input{width:100%;font:650 clamp(27px,2.5cqw,38px)/1.4 var(--serif)!important;letter-spacing:-.02em;margin:0 0 11px;color:var(--ink);border:0;background:transparent;padding:0}.paper-meta{justify-content:space-between;flex-wrap:wrap;gap:7px 12px;margin-bottom:19px}
.paper-doc-head .paper-back{display:none}.paper-inset p{margin:4px 0}.paper-inset button,.paper-options button{font-size:13px}.paper-options{display:flex;gap:8px;align-items:start;flex-wrap:wrap}
.paper-reading .note-markdown,.paper-writing .cm-scroller{font:16px/1.85 "Segoe UI","Microsoft YaHei UI",sans-serif}.paper-reading .note-markdown :is(h1,h2,h3,h4,h5,h6),.paper-writing .paper-h{font-family:var(--serif);line-height:1.5;letter-spacing:-.025em;font-weight:650}
.paper-reading .note-markdown :is(h1,h2,h3,h4,h5,h6){margin:1.25em 0 .35em}.paper-reading .note-markdown p{margin:.65em 0}.paper-reading blockquote,.paper-quote{padding-inline-start:14px;border-left:3px solid var(--accent);color:var(--muted);margin-inline-start:0}
.paper-reading img,.paper-writing img.paper-image{display:block;max-width:100%;max-height:500px;object-fit:contain;border-radius:4px;margin:12px 0}
.paper-table-wrap{max-width:100%;overflow:auto;border:1px solid var(--rule);border-radius:10px;margin:14px 0;background:var(--paper)}
.paper-reading .paper-table-wrap table,.paper-table table{width:100%;border-collapse:separate;border-spacing:0;display:table;margin:0;font-size:.93em}
.paper-reading .paper-table-wrap :is(th,td),.paper-table :is(th,td){border:0;border-bottom:1px solid var(--rule);border-inline-end:1px solid color-mix(in srgb,var(--rule) 72%,transparent);padding:8px 13px;text-align:start}
.paper-reading .paper-table-wrap :is(th,td):last-child,.paper-table :is(th,td):last-child{border-inline-end:0}
.paper-reading .paper-table-wrap th,.paper-table th{background:var(--shelf);font-weight:650;color:var(--ink)}
.paper-reading .paper-table-wrap tbody tr:last-child td,.paper-table tbody tr:last-child td{border-bottom:0}
.paper-reading .note-markdown>table,.paper-table{max-width:100%;display:block;overflow:auto;border-collapse:separate;border-spacing:0;border:1px solid var(--rule);border-radius:10px}
.paper-empty{max-width:650px;margin:48px auto;padding:0 20px;overflow:auto}
.paper-overview-viewport{
  --overview-paper:var(--paper);--overview-tint:color-mix(in srgb,var(--accent) 7%,var(--paper));--overview-glow:color-mix(in srgb,var(--accent) 12%,var(--paper));
  --overview-ink:var(--ink);--overview-quiet:var(--muted);--overview-heading:var(--ink);
  --overview-rule:var(--rule);--overview-outline:var(--rule);--overview-opened:var(--fatfish-brand-arc,#529849);--overview-modified:var(--accent);
  --overview-hover:var(--selected);--overview-accent:var(--accent);--overview-primary:var(--accent);--overview-on-primary:var(--on-accent,#ffffff);
  --overview-control:var(--paper);
  container:note-overview / size;flex:1;min-height:0;overflow:auto;color:var(--overview-ink);
  background:radial-gradient(ellipse 62% 240px at 50% 0,var(--overview-glow),transparent 100%),
    linear-gradient(var(--overview-tint),transparent 230px),var(--overview-paper);
  background-attachment:local,local,scroll;
}
.paper-app[data-theme=dark] .paper-overview-viewport{
  --overview-tint:color-mix(in srgb,var(--accent) 8%,var(--paper));
  --overview-glow:color-mix(in srgb,var(--accent) 14%,var(--paper));
  --overview-control:var(--shelf);
}
.paper-overview{box-sizing:border-box;max-width:1100px;margin-inline:auto;padding:clamp(19px,5.4cqi,62px)}
.paper-overview header{display:grid;justify-items:center;padding:clamp(15px,3.6cqi,36px) 0 clamp(23px,4.4cqi,43px)}
.paper-overview h2,.paper-overview h3{margin:0}
.paper-overview h3{color:var(--overview-heading);font:700 20px/1.35 "Songti SC","Noto Serif CJK SC",SimSun,serif;letter-spacing:.035em}
.paper-overview-brand{display:flex;justify-content:center;align-items:center;gap:clamp(8px,2.2cqi,22px);max-width:100%}
.paper-overview-brand .fatfish-mark{width:clamp(55px,16.5cqi,144px);height:auto;aspect-ratio:10/7}
.paper-overview-brand .fatfish-wordmark{display:block;width:clamp(108px,36.4cqi,270px);height:auto;min-width:0;max-width:100%}
.paper-overview-brand .fatfish-wordmark-text{width:auto;font-size:clamp(23px,5cqi,45px);font-weight:650;line-height:1.15}
.paper-overview-actions{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:11px;margin-top:clamp(19px,3.2cqi,27px)}
.paper-app .paper-overview-actions :is(button,a){
  display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:45px;padding:8px 15px;
  border:1px solid var(--overview-outline);border-radius:10px;color:var(--overview-accent);
  background:var(--overview-control);font-weight:650;text-align:center;text-decoration:none;
}
.paper-app .paper-overview-actions .paper-overview-new{min-width:120px;background:var(--overview-primary);color:var(--overview-on-primary);border-color:transparent}
.paper-app .paper-overview-actions .paper-overview-new:hover{filter:brightness(1.1);background:var(--overview-primary)}
.paper-overview-actions a:hover{background:var(--overview-hover)}
.paper-overview-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(25px,5.8cqi,65px);margin-top:20px}
.paper-overview-groups>section{position:relative;min-width:0;border-top:1px solid var(--overview-rule);padding-top:19px}
.paper-overview-groups>section::before{content:'';position:absolute;inset:-1px auto auto 0;width:25px;height:2px;border-radius:0 2px 2px 0;background:var(--overview-modified)}
.paper-overview-groups>section[data-recent=opened]::before{background:var(--overview-opened)}
.paper-overview-groups>section:only-child{grid-column:1/-1}
.paper-overview-notes{list-style:none;padding:0;margin:12px 0 0}
.paper-app .paper-overview-notes li>button{
  display:flex;align-items:flex-start;justify-content:space-between;gap:10px;width:100%;min-height:53px;padding:9px 0;
  text-align:start;color:var(--overview-ink);
}
.paper-app .paper-overview-notes li>button:hover{background:var(--overview-hover);box-shadow:0 0 0 5px var(--overview-hover)}
.paper-overview-note-text{min-width:0;display:grid;gap:3px}
.paper-overview-title{font-size:15px;font-weight:400;line-height:1.38;letter-spacing:.005em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
.paper-overview-note-text small{font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.paper-overview :is(small,time){color:var(--overview-quiet)}
.paper-overview time{flex:none;padding-top:2px;white-space:nowrap;font-size:11px;font-variant-numeric:tabular-nums}
.paper-overview-groups li:nth-child(n+6){display:none}
@container note-overview (min-width:630px) and (min-height:555px){.paper-overview-groups li:nth-child(-n+10){display:list-item}}
@container note-overview (min-width:810px) and (min-height:735px){.paper-overview-groups li:nth-child(-n+15){display:list-item}}
@container note-overview (width <575px){
  .paper-overview-groups{grid-template-columns:minmax(0,1fr);gap:20px;margin-top:12px}
  .paper-overview header{padding-bottom:21px}
  .paper-overview-groups>section{padding-top:15px}
  .paper-overview h3{font-size:19px}
  .paper-app .paper-overview-actions :is(button,a){font-size:13px;padding-inline:10px}
  .paper-app .paper-overview-actions .paper-overview-new{min-width:102px}
}
@container note-overview (width <315px){
  .paper-overview-actions{flex-direction:column;align-items:stretch;width:min(100%,205px)}
}
.paper-overview-viewport[data-compact=true]{display:none}
@container paper (width < 560px){
  .paper-overview-viewport[data-compact=true]{display:block;container-type:inline-size;overflow:visible}
}
.paper-leaf{container:leaf / inline-size}
.paper-doc-head{position:relative;z-index:10;display:block;flex:none;margin:0 14px 0 0;padding:8px clamp(18px,2.5cqw,40px);background:var(--paper);border-bottom:1px solid var(--rule)}
/* Cover the scroll pane's top gutter while the header is sticky. */
.paper-formatbar::before{content:"";position:absolute;inset:calc(-1 * var(--paper-top-gap)) 0 auto;height:var(--paper-top-gap);background:var(--paper)}
.paper-command-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.paper-command-lead{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto}.paper-command-lead>.paper-book{min-width:0;overflow:hidden;max-width:210px;white-space:nowrap}.paper-command-lead>.paper-book>span{overflow:hidden;text-overflow:ellipsis}
.paper-actions{position:relative;flex-wrap:nowrap}.paper-actions button{white-space:nowrap}.paper-overflow{display:none}
.paper-actions .paper-popup{right:0;width:max-content;max-width:100%;min-width:145px}.paper-actions .paper-popup button{display:flex;width:100%;justify-content:start}
@container document (max-width:540px){.paper-actions>button.paper-secondary{display:none}.paper-overflow{display:block}}
@container document (max-width:330px){.paper-command-lead>.paper-book{font-size:0;max-width:40px}.paper-command-lead>.paper-book>svg{display:none}.paper-actions{gap:0}.paper-actions button{font-size:12px;padding-inline:4px}}
.paper-views{display:inline-flex;gap:2px;font-size:12px;color:var(--muted);margin:0;flex:none}.paper-views button{padding:2px 8px;font-size:12px}.paper-views button[aria-pressed=true]{background:var(--paper);color:var(--ink);font-weight:600}
.paper-list{display:flex;flex-direction:column;overflow:hidden;padding-bottom:0;padding-right:6px}.paper-list-scroll{overflow:auto;min-height:0;flex:1;scrollbar-width:thin;padding-right:6px}.paper-list-foot{border-top:1px solid var(--rule);padding:8px 0 4px;color:var(--muted);flex:none}
.paper-trash-title{font:650 25px/1.4 var(--serif)}.paper-order{display:flex;align-items:center;gap:5px;margin:10px 0 0 6px;color:var(--muted)}.paper-order select{font-size:12px;border:0;background:transparent;color:var(--muted);cursor:pointer}.paper-order option{background:Canvas;color:CanvasText}
.paper-summary{position:relative;margin:14px 0 22px;padding:11px 16px 12px 17px;border:1px solid color-mix(in srgb,var(--accent) 16%,var(--rule));border-radius:10px;background:var(--summary-bg,var(--shelf));overflow:hidden}
.paper-summary::before{content:"";position:absolute;inset:0 auto 0 0;width:3.5px;background:var(--accent)}
.paper-summary label,.paper-summary .paper-summary-body{display:block;border:0;padding:0;background:transparent}
.paper-summary span{display:block;color:var(--accent);font-size:11.5px;font-weight:650;letter-spacing:.03em;margin-bottom:3px}.paper-summary p{margin:0;white-space:pre-wrap;color:var(--ink)}
.paper-metadata{margin:0;display:grid;gap:8px;color:var(--muted)}.paper-edit-meta{margin-bottom:10px!important}.paper-edit-meta-brief{color:var(--muted);font-size:12px}.paper-meta-toggle{display:inline-flex;align-items:center;gap:4px;padding:3px 10px!important;border-radius:999px!important;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--rule))!important;background:var(--selected)!important;color:var(--accent)!important;font-size:12px!important;font-weight:600}.paper-meta-toggle[aria-expanded=true] svg{transform:rotate(180deg)}.paper-meta-toggle svg{transition:transform .15s}.paper-meta-drawer{display:grid;gap:10px;padding:12px 14px;margin:0 0 14px;border:1px solid color-mix(in srgb,var(--accent) 24%,var(--rule));border-radius:10px;background:var(--shelf)}.paper-meta-drawer .paper-summary{margin:0;background:var(--paper)}.paper-metadata>label{display:flex;align-items:center;gap:8px;margin:0!important}.paper-metadata select,.paper-metadata input{background:var(--paper);border:1px solid var(--rule);border-radius:5px;padding:4px 8px}.paper-tag-editor{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:6px}.paper-tag-items,.paper-tag-items form{display:flex;align-items:center;gap:6px}.paper-tag-items form{flex:0 1 170px;min-width:0}.paper-tag-items form input{min-width:0;flex:1;width:100%}.paper-tag-add{flex:none!important;width:28px!important;height:28px;padding:0!important;display:inline-flex;align-items:center;justify-content:center}.paper-tag-editor>.paper-tag-suggestions{grid-column:2;margin-top:0}.paper-tag-editor>span{flex:none;font-size:13px}.paper-tag-items{flex-wrap:wrap}.paper-tag-items input{width:9em;max-width:100%}.paper-tag-items>button{background:var(--paper);border:1px solid var(--rule)!important;border-radius:999px!important;padding:2px 9px!important}.paper-metadata button{font-size:13px}
.paper-summary textarea{display:block;width:100%;background:transparent;border:0;resize:vertical;overflow-y:auto;padding:2px 0;color:var(--ink);line-height:var(--reading-leading,1.85);field-sizing:content;
  min-height:min(calc(2lh + 4px),var(--summary-available-height,100%));max-height:min(calc(8lh + 4px),var(--summary-available-height,100%))}
/* The native resize grip writes an inline height for this open drawer. */
.paper-summary textarea[style*="height:"]{max-height:var(--summary-available-height,none)}
.paper-notice{margin:12px 0;padding:7px 12px;background:var(--shelf);border-radius:6px;color:var(--muted)}
.paper-export-fields{display:flex;flex-wrap:wrap;gap:4px 22px}.paper-checkbox{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:12px}.paper-dialog .paper-checkbox input{margin:0;width:16px;height:16px;flex:none;accent-color:var(--accent)}

.paper-formatbar{position:sticky;top:0;z-index:3;margin:0 0 14px;padding:4px 0;border-block:1px solid var(--rule);background:var(--paper)}.paper-toolstrip{display:flex;align-items:center;min-width:0;flex:1}.paper-toolstrip button{height:30px;min-width:29px;white-space:nowrap}.paper-toolstrip [aria-pressed=true]{color:var(--accent);background:var(--selected)}
.paper-detail button.paper-primary,.paper-empty .paper-primary{background:var(--accent);color:var(--on-accent,var(--base))}.paper-detail button.paper-primary:hover{filter:brightness(1.06);background:var(--accent);color:var(--on-accent,var(--base))}
.paper-popup{position:absolute;top:100%;z-index:4;min-width:155px;padding:5px;max-height:45vh;overflow:auto;background:var(--base);border:1px solid var(--rule);border-radius:8px;box-shadow:0 5px 20px #0002}.paper-popup.heading{left:0}.paper-popup.more{right:0}.paper-formatbar .paper-popup button{width:100%;display:flex;justify-content:start;gap:10px;font-size:13px}.paper-popup small{color:var(--muted)}
.paper-link-form{display:flex;flex-wrap:wrap;align-items:end;gap:8px}.paper-link-form label{display:grid;flex:1;min-width:140px}.paper-inset input,.paper-link-form input,.paper-controls input{background:var(--paper);border:1px solid var(--rule);border-radius:4px;padding:4px 8px;width:100%}
.paper-writing .cm-editor.cm-focused{outline:none}.paper-writing .cm-scroller{overflow:visible}.paper-writing .cm-content{padding:0 0 20px;caret-color:var(--accent)}.paper-writing .cm-line{padding:0;overflow-wrap:anywhere}.paper-writing .cm-cursor{border-left:2px solid var(--accent)}
.paper-writing .cm-editor.cm-focused .cm-selectionBackground{background:var(--selected)}.paper-writing .cm-line:has(>br:only-child){min-height:13px;line-height:13px}
.paper-writing .h1{font-size:26px}.paper-writing .h2{font-size:22px}.paper-writing .h3{font-size:19px}.paper-writing .h4{font-size:17px}.paper-writing .h6{font-size:14px;color:var(--muted)}
.paper-token,.paper-bullet,.paper-link{color:var(--accent)}.paper-link{text-decoration:underline}.paper-StrongEmphasis{font-weight:bold}.paper-Emphasis{font-style:italic}.paper-Strikethrough{text-decoration:line-through}
.paper-InlineCode,.paper-code-line,.paper-code,.paper-reading pre{font:14px/1.7 Consolas,monospace;background:var(--shelf);border-radius:4px}.paper-code{padding:10px 14px}.paper-code pre{margin:0;white-space:pre-wrap}
.paper-writing .cm-panels{color:var(--ink);background:var(--shelf)}.paper-writing .cm-searchMatch{background:#c998474f}.paper-writing .cm-searchMatch-selected{background:#c9984790}
.paper-document{container:document / inline-size;display:flex;flex-direction:column;min-width:0;min-height:0;flex:1}
.paper-document-body{--outline-size:220px;--outline-right:12px;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);position:relative;min-width:0;min-height:0;flex:1}
.paper-document-body>.paper-pane{grid-area:1/1}
.paper-document[data-outline=pinned]>.paper-document-body{grid-template-columns:minmax(0,1fr) var(--outline-size);gap:12px;padding-right:var(--outline-right)}
.paper-actions .paper-outline-toggle{margin-left:5px;border-left:1px solid var(--rule);border-radius:0 5px 5px 0;padding-left:10px}
.paper-outline-toggle[aria-expanded=true]{color:var(--accent);background:var(--shelf)}
.paper-outline{grid-area:1/2;min-width:0;min-height:0;display:flex;flex-direction:column;border-left:1px solid var(--rule);padding:8px 0 12px 8px;color:var(--muted);font:13px/1.6 "Segoe UI","Microsoft YaHei UI",sans-serif;overflow:hidden}
.paper-outline header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 3px 10px 10px;flex:none}
.paper-outline header>span{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;letter-spacing:.04em}.paper-outline header button{padding:4px}
.paper-outline-scroll{overflow:auto;min-height:0;flex:1;overscroll-behavior:contain;padding:2px 0 8px}
.paper-outline ol{list-style:none;padding:0;margin:0}.paper-outline li{margin:2px 0}
.paper-outline nav button{display:flex;justify-content:start;text-align:start;white-space:normal;width:100%;padding:7px 8px;line-height:1.6;font-size:13px;color:var(--muted);border-radius:5px}
.paper-outline nav button span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
.paper-outline nav button[aria-current=location]{color:var(--accent);background:var(--shelf);box-shadow:inset 2px 0 0 var(--accent);font-weight:600}
.paper-outline nav button:disabled{opacity:1}.paper-outline-empty{margin:4px 10px 12px;font-size:13px}
.paper-document[data-outline=floating]>.paper-document-body{--outline-size:min(260px,calc(100% - 56px));--outline-right:26px}
.paper-document[data-outline=floating] .paper-outline{grid-area:1/1;position:absolute;z-index:8;top:8px;bottom:8px;right:var(--outline-right);width:var(--outline-size);border:1px solid var(--rule);border-radius:10px;padding:10px 8px 10px 8px;background:var(--base);box-shadow:0 8px 28px #0002}
.paper-detail .paper-outline-edge{position:absolute;top:50%;right:14px;transform:translateY(-50%);z-index:9;width:18px;height:44px;padding:0;border:1px solid var(--rule);border-radius:999px;background:var(--paper);box-shadow:0 2px 8px #00000014;color:var(--muted);opacity:.78;transition:opacity .15s,border-color .15s,color .15s}
.paper-app .paper-detail .paper-outline-edge:hover,.paper-app .paper-detail .paper-outline-edge:focus-visible{opacity:1;border-color:var(--accent);color:var(--accent);background:var(--paper)}
.paper-outline-edge svg{flex:none}.paper-outline-edge[aria-expanded=false] svg{transform:scaleX(-1)}
.paper-document:not([data-outline=closed]) .paper-outline-edge{right:calc(var(--outline-size) + var(--outline-right) - 9px)}
/* Keep the native 14px hit area fixed; only the thumb's visible inset changes. */
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll){scrollbar-width:auto;scrollbar-color:auto;scrollbar-gutter:stable;overscroll-behavior:contain}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar{width:14px;height:14px}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-track{background:transparent;border-radius:8px}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-track:hover{background:var(--shelf)}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-thumb{min-height:32px;border:4px solid transparent;border-radius:8px;background:color-mix(in srgb,var(--muted) 65%,transparent);background-clip:padding-box}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-thumb:hover,.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-thumb:active{border-width:2px;background-color:var(--muted)}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-button{display:none;width:0;height:0}
.paper-app :is(.paper-pane,.paper-list-scroll,.paper-outline-scroll)::-webkit-scrollbar-corner{background:transparent}
@container paper (max-width:750px){.paper-backup{max-width:100px}.paper-top{gap:8px}.paper-top nav{gap:4px}.paper-list{padding:15px 6px 0 10px}.paper-pane{padding:var(--paper-top-gap) 18px 18px}}
@container paper (width < 560px){.paper-top{flex-wrap:wrap;padding:5px 10px;min-height:46px}.paper-top>strong{font-size:14px}.paper-backup{display:none}.paper-backup:has([data-attention=true]){display:block;flex-basis:100%;max-width:none}.paper-top nav button{font-size:12px}.paper-top .paper-width button{font-size:11px}.paper-split{display:flex}.paper-list,.paper-detail{width:100%}.paper-divider,.paper-split[data-selected=true] .paper-list,.paper-split[data-selected=false] .paper-detail{display:none}.paper-doc-head .paper-back{display:inline-flex}.paper-title-input{font-size:30px}.paper-actions .paper-attach{padding-inline:4px}}
.paper-app .paper-document .paper-pane{padding-right:40px}

/* Shared by the library list and conversation lookup. */
.paper-app .paper-search-controls{display:flex;flex-direction:column;gap:7px;min-width:0;font-size:12px}
.paper-app[data-density=compact] .paper-search-controls{gap:6px}
.paper-app[data-density=spacious] .paper-search-controls{gap:9px}
.paper-app .paper-search-row{display:flex;align-items:stretch;gap:5px;min-width:0}
.paper-app .paper-search-row .paper-search,.paper-app .paper-tag-search{
  display:flex;align-items:center;gap:5px;flex:1;min-width:0;box-sizing:border-box;
  padding:0 7px;margin:0;border:1px solid var(--rule);border-radius:7px;background:var(--input);color:var(--muted)
}
.paper-app :is(.paper-search-row .paper-search,.paper-tag-search):focus-within{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.paper-app :is(.paper-search-row .paper-search,.paper-tag-search) input{
  width:100%;min-width:0;min-height:30px;margin:0;padding:2px 0;border:0;outline:none;
  background:transparent;color:var(--ink);box-shadow:none;font:inherit
}
.paper-app .paper-tag-search input{min-height:25px}
.paper-app .paper-search-controls :is(.paper-list-tools){margin:0;gap:5px 7px;align-items:center}
.paper-app .paper-search-controls :is(.paper-order,.paper-quick-view){display:inline-flex;align-items:center;gap:4px;margin:0;min-width:0}
.paper-app .paper-search-controls .paper-order{height:28px;padding:0 7px;border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--muted);box-sizing:border-box;transition:border-color .15s,color .15s}
.paper-app .paper-search-controls .paper-order:hover{border-color:color-mix(in srgb,var(--accent) 42%,var(--rule));color:var(--ink)}
.paper-app .paper-search-controls .paper-order:focus-within{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.paper-app .paper-search-controls select{
  box-sizing:border-box;min-width:0;max-width:100%;min-height:25px;padding:2px 4px;margin:0;
  background:var(--input);color:var(--ink);border:1px solid var(--rule);border-radius:5px;font:inherit;text-overflow:ellipsis
}
.paper-app .paper-search-controls .paper-order select{
  appearance:none;-webkit-appearance:none;border:0;background:transparent;height:26px;min-height:26px;line-height:26px;
  padding:0 2px;font-size:11.5px;color:var(--ink);max-width:min(108px,100%);cursor:pointer;outline:none
}
.paper-app .paper-list-tools .paper-batch{display:inline-flex;align-items:center;min-height:28px}
.paper-app .paper-list-tools .paper-batch>button{height:28px;padding:0 7px;font-size:11.5px}
.paper-app .paper-search-controls .paper-quick-view small{font-size:10px;color:var(--muted)}
.paper-app .paper-search-controls .paper-search-toggle{
  display:inline-flex;flex:none;align-items:center;justify-content:center;gap:4px;white-space:nowrap;
  padding:0 6px;border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--ink);font:inherit
}
.paper-app .paper-search-controls .paper-search-toggle:is(:hover,[aria-expanded=true],[data-active=true]){
  background:var(--selected);color:var(--accent)
}
.paper-app .paper-search-controls .paper-search-toggle[aria-expanded=true]{border-color:color-mix(in srgb,var(--accent) 43%,var(--rule))}
.paper-app .paper-search-toggle b{font-variant-numeric:tabular-nums;font-size:11px}
.paper-app .paper-search-chips{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.paper-app .paper-search-controls .paper-filter-chip{
  display:inline-flex;align-items:center;gap:4px;max-width:100%;min-width:0;margin:0;
  border:0;border-radius:5px;padding:3px 6px;background:var(--selected);color:var(--accent);font-size:11px
}
.paper-app .paper-filter-chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.paper-app .paper-search-controls .paper-filter-chip:hover{box-shadow:inset 0 0 0 1px var(--accent)}
.paper-app :is(.paper-search-controls,.paper-search-status) .paper-filter-text{
  display:inline-flex;align-items:center;gap:3px;min-height:22px;min-width:0;padding:2px 4px;margin:0;
  background:transparent;color:var(--accent);border:0;border-radius:5px;font-size:11px
}
.paper-app :is(.paper-search-controls,.paper-search-status) .paper-filter-text:hover{background:var(--selected)}
.paper-app .paper-search-filter-panel{
  display:grid;align-content:start;gap:6px;min-width:0;box-sizing:border-box;padding:8px;
  background:color-mix(in srgb,var(--shelf) 94%,var(--accent));border:1px solid var(--rule);border-radius:8px;color:var(--ink)
}
.paper-app .paper-search-filter-panel :is(header,.paper-tag-heading,.paper-filter-options){
  display:flex;align-items:center;justify-content:space-between;gap:4px 6px;min-width:0
}
.paper-app .paper-filter-options{flex-wrap:wrap}
.paper-app .paper-filter-options label{display:inline-flex;align-items:center;gap:5px;min-width:0}
.paper-app .paper-filter-options input[type=checkbox]{width:13px;height:13px;margin:0;accent-color:var(--accent)}
.paper-app .paper-tag-heading,.paper-app .paper-search-filter-panel>small{color:var(--muted);font-size:11px}
.paper-app .paper-tag-heading button{flex:none;white-space:nowrap}
.paper-app .paper-search-tag-layout{position:relative;min-width:0}
.paper-app .paper-search-tag-measure{position:absolute;inset:0 0 auto;height:0;overflow:hidden;visibility:hidden;pointer-events:none}
.paper-app :is(.paper-search-tag-choices,.paper-search-tag-probe){display:flex;flex-wrap:wrap;align-items:flex-start;gap:4px;min-width:0}
.paper-app .paper-search-tag-choices[data-directory=true]{
  max-block-size:clamp(72px,15dvh,116px);overflow:auto;scrollbar-width:thin;overscroll-behavior:contain
}
.paper-app .paper-search-controls .paper-search-tag{
  display:inline-flex;flex:none;align-items:center;justify-content:flex-start;gap:4px;min-width:0;min-height:25px;
  max-width:min(100%,190px);padding:3px 6px;margin:0;border:1px solid var(--rule);border-radius:6px;background:var(--input);
  color:var(--ink);font-size:11px;line-height:1.35;text-align:start;white-space:nowrap
}
.paper-app .paper-search-tag>span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.paper-app .paper-search-tag>small{flex:none;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
.paper-app .paper-search-controls button.paper-search-tag:hover{border-color:var(--accent)}
.paper-app .paper-search-controls button.paper-search-tag[aria-pressed=true]{background:var(--selected);border-color:var(--accent);color:var(--accent)}
.paper-app :is(.paper-list-controls,.conversation-search-area):has(.paper-search-filter-panel){scrollbar-width:thin;scrollbar-gutter:stable}
.paper-app .paper-filter-management{border-block-start:1px solid var(--rule);padding-top:2px}
.paper-app :is(.paper-search-controls,.paper-search-status) :is(button,select):focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.paper-app .paper-search-status{display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;margin-top:6px;color:var(--muted);font-size:11px}
.paper-app .paper-search-status span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.paper-app .paper-search-status .paper-scope-all{flex:none}
@media(max-height:720px){.paper-app .paper-search-tag-choices[data-directory=true]{max-block-size:82px}}
.paper-hit-source{color:var(--accent)}
${experienceCss}
`
