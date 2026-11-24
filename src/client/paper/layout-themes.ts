/** Three focused layouts sharing the same DOM slots so an active editor survives switches. */
export const layoutThemesCss = `
.paper-split{--panel-gap:0px;--book-gap:var(--panel-gap);column-gap:0;grid-template-columns:var(--book-width) var(--book-gap) var(--list-width) var(--panel-gap) minmax(0,1fr)}
.paper-split[data-notebooks=false]{--book-gap:0px}
.paper-split>.paper-divider{justify-self:center;margin-left:0}
.paper-reader{display:flex;flex-direction:column;min-height:0;min-width:0;flex:1;overflow:hidden}.paper-reader[hidden]{display:none}.paper-reader>p[role=status]{position:absolute;bottom:4px;left:20px;z-index:10;background:var(--paper)}
.paper-workspace-other{min-height:0;min-width:0;flex:1;display:flex;flex-direction:column;overflow:hidden}.paper-workspace-other>.paper-other{height:100%;width:100%}
.paper-split:not([data-section=notes]){grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)}
.paper-split:not([data-section=notes])>:is(.paper-list,.paper-divider,.paper-notebook-nav){display:none}
.paper-split:not([data-section=notes])>.paper-detail{grid-column:1;grid-row:1}
.paper-app[data-layout] .paper-primary{background:var(--accent);color:var(--on-accent,var(--paper))}
.paper-app[data-layout] .paper-book-list{display:block;border:1px solid var(--rule);border-radius:10px;overflow:hidden}.paper-app[data-layout] .paper-book-entry{border:0;border-bottom:1px solid var(--rule);border-radius:0;margin:0;background:transparent}.paper-app[data-layout] .paper-book-entry:last-child{border-bottom:0}.paper-app[data-layout] .paper-book-open{padding:12px 16px}.paper-app[data-layout] .paper-book-name{display:flex;align-items:center;gap:20px;flex:1}.paper-app[data-layout] .paper-book-name>strong{flex:1}.paper-app[data-layout] .paper-book-details{margin:0;white-space:nowrap}
.paper-app[data-layout] .appearance-settings>header>button{padding:6px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--shelf);color:var(--ink);cursor:pointer}

/* Soft cards layout */
.paper-app[data-layout=soft]{padding:8px;gap:8px;background:var(--shelf)}
.paper-app[data-layout=soft] .paper-top{border:1px solid var(--rule);border-radius:12px;padding:0 18px;min-height:48px}
.paper-app[data-layout=soft] .paper-split{--panel-gap:10px}
.paper-app[data-layout=soft] :is(.paper-split>:is(.paper-notebook-nav,.paper-list,.paper-detail),.class-workspace>:is(.class-directory,.class-center,.class-reader)){border:1px solid var(--rule);border-radius:12px;background:var(--paper);box-shadow:0 2px 8px #00000008}
.paper-app[data-layout=soft] .paper-list-controls{background:var(--paper)}
.paper-app[data-layout=soft] .paper-row{border-radius:9px;padding:11px 12px;margin:3px 0;border-bottom:0}
.paper-app[data-layout=soft][data-density=balanced]{padding:12px;gap:12px}.paper-app[data-layout=soft][data-density=balanced] .paper-split{--panel-gap:14px}
.paper-app[data-layout=soft][data-density=spacious]{padding:16px;gap:16px}.paper-app[data-layout=soft][data-density=spacious] .paper-split{--panel-gap:18px}

/* Notebook tree layout */
.paper-app[data-layout=tree] .paper-split{--book-width:0px!important;grid-template-columns:0 0 var(--list-width) 0 minmax(0,1fr)}
.paper-app[data-layout=tree] .paper-split>.paper-notebook-nav,.paper-app[data-layout=tree] .paper-split>.paper-divider:nth-child(2){display:none}
.paper-app[data-layout=tree] .paper-split:not([data-section=notes]){grid-template-columns:minmax(0,1fr)}
.paper-app[data-layout=tree] .paper-expand-notebooks{display:none}
.paper-tree-group>header{display:flex;align-items:center;gap:3px}.paper-tree-group>header>button{flex:1;text-align:left;justify-content:flex-start;min-width:0;font-weight:600;padding:8px 4px}.paper-tree-group>header span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.paper-tree-group>header small{color:var(--muted)}
.paper-tree-items{margin-left:10px;border-left:1px solid var(--rule);padding-left:7px}
.paper-tree-row{content-visibility:auto;contain-intrinsic-size:auto 36px}.paper-tree-row .paper-row{padding:7px!important;border-radius:6px;margin:2px 0;font-size:12px}.paper-tree-row .paper-row strong{font-size:12px}
.paper-tree-group>header>.paper-menu-row{flex:1}.paper-tree-row .paper-menu-row>.paper-row-more{top:50%;transform:translateY(-50%)}.paper-tree-row .paper-menu-row{min-width:0}.paper-tree-row .paper-row-more{padding:2px!important}.paper-tree-more{font-size:12px!important;color:var(--accent)!important}

@container paper (max-width:750px){.paper-app[data-layout=soft]{padding:5px;gap:5px}.paper-app[data-layout] .paper-book-name{display:block}.paper-app[data-layout] .paper-book-details{margin-top:4px}}
@container paper (max-width:559px){
  .paper-app[data-layout] .paper-split{display:flex;flex-direction:column}.paper-app[data-layout] .paper-split>.paper-notebook-nav{display:none}.paper-app[data-layout] .paper-split>.paper-divider{display:none}.paper-app[data-layout] .paper-split>.paper-list{flex:1;min-height:0;border:0}.paper-app[data-layout] .paper-split[data-section=notes][data-selected=true]>.paper-list{display:none}.paper-app[data-layout] .paper-split[data-section=notes][data-selected=false]>.paper-detail{display:none}.paper-app[data-layout] .paper-split>.paper-detail{flex:1}.paper-app[data-layout] .paper-split:not([data-section=notes])>.paper-list{display:none}.paper-app[data-layout] .paper-split:not([data-section=notes])>.paper-detail{display:flex}
}
.conversation-notes[data-layout=soft]{padding:6px;background:var(--shelf);gap:6px}.conversation-notes[data-layout=soft]>.paper-detail{border-radius:12px;background:var(--paper);border:1px solid var(--rule)}
`
