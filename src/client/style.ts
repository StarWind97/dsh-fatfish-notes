import type { CSSProperties } from 'react'
export const styles = {
  page:{padding:20,maxWidth:960,margin:'0 auto',width:'100%',boxSizing:'border-box',color:'var(--dsw-alias-label-primary)',overflowWrap:'anywhere'},
  card:{padding:16,margin:'14px 0',border:'1px solid var(--dsw-alias-border-l2)',borderRadius:10},
  row:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'},
  input:{display:'block',width:'100%',minWidth:0,boxSizing:'border-box',padding:8,border:'1px solid var(--dsw-alias-border-l2)',borderRadius:6,background:'var(--dsw-alias-bg-layer-2)',color:'inherit',font:'inherit'},
  button:{padding:'6px 12px',border:'1px solid var(--dsw-alias-border-l2)',borderRadius:6,background:'var(--dsw-alias-bg-layer-2)',color:'inherit',font:'inherit',cursor:'pointer'},
  muted:{color:'var(--dsw-alias-label-secondary)',fontSize:13},
  error:{color:'var(--dsw-alias-state-error-primary, #c33)'},
  markdown:{whiteSpace:'pre-wrap',overflowWrap:'anywhere',font:'inherit',padding:14,background:'var(--dsw-alias-bg-layer-2)',borderRadius:8},
  label:{display:'block',margin:'8px 0',flex:'1 1 200px',minWidth:0},
} satisfies Record<string, CSSProperties>
