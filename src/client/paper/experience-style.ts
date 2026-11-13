/** Shared by the library, conversation sidebar and standalone window. */
export const experienceCss=`
.paper-app{--accent:color-mix(in srgb,var(--ink) 25%,#28a99e);--paper:var(--base);--shelf:color-mix(in srgb,var(--base) 96%,#608a87);--selected:color-mix(in srgb,var(--base) 86%,#28a99e);--supplement:color-mix(in srgb,var(--base) 94%,#39968b);--reference:color-mix(in srgb,var(--base) 94%,#6089cb)}
.paper-app .paper-dialog{--accent:color-mix(in srgb,var(--ink) 25%,#28a99e);--selected:color-mix(in srgb,var(--base) 86%,#28a99e)}
.paper-app .paper-book>svg,.paper-app .paper-tags button[aria-pressed=true],.paper-app .paper-top nav button[aria-pressed=true]{color:var(--accent)}
.paper-app .paper-primary{background:var(--accent)!important;color:var(--base)!important;border-color:transparent!important}
.paper-app .paper-pane:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}
.paper-app .paper-supplements,.paper-app .paper-backlinks{font:13px/1.65 "Segoe UI","Microsoft YaHei",sans-serif;border:1px solid color-mix(in srgb,var(--rule) 80%,var(--accent));border-radius:12px;padding:16px 18px;margin:28px 0 0;background:var(--supplement);color:var(--ink)}
.paper-app .paper-backlinks{background:var(--reference);border-color:color-mix(in srgb,var(--rule) 75%,#6089cb)}
.paper-app .paper-supplements h3,.paper-app .paper-backlinks>button{font:600 13px/1.6 "Segoe UI","Microsoft YaHei",sans-serif;margin:0;letter-spacing:.01em}
.paper-app .paper-supplements h3>svg{color:var(--accent)}.paper-app .paper-backlinks>button>svg{color:color-mix(in srgb,var(--ink) 25%,#6089cb)}
.paper-app .paper-supplement-row{background:var(--base);border:1px solid var(--rule);border-radius:8px;margin-top:8px;padding:11px 12px}
.paper-app .paper-supplement-row>svg{color:var(--accent)}.paper-app .paper-supplement-row button{min-width:28px;min-height:28px}
.paper-app .paper-backlinks ul{list-style:none;padding:0;margin:10px 0 0}.paper-app .paper-backlinks li{margin:4px 0}.paper-app .paper-backlinks li button{width:100%;justify-content:space-between;text-align:left;padding:7px 8px;min-height:32px;color:var(--ink)}
.paper-app .paper-backlinks p{margin:10px 0 0;font:inherit;color:var(--muted)}
.paper-dialog.paper-history-dialog{width:min(940px,calc(100vw - 32px))}
.paper-app .paper-reading a,.paper-app .paper-source a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}
.paper-app .paper-meta{gap:8px 16px}.paper-app .paper-stamp{flex-wrap:wrap;white-space:normal}
.paper-app .paper-summary{background:var(--shelf);border-left-color:var(--accent);border-radius:0 8px 8px 0}
@container paper (width < 560px){.paper-app .paper-supplements,.paper-app .paper-backlinks{padding:13px 12px;border-radius:9px}.paper-app .paper-supplement-row{padding:10px 8px}}
`
