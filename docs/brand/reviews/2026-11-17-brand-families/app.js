const {families}=await fetch('catalog.json').then(r=>r.json());
const byId=id=>families.find(f=>f.id===id),$=s=>document.querySelector(s);
const scenes={identity:'完整标识',mark:'鱼形与应用图标',ui:'界面位置',taskbar:'任务栏对比',cover:'宣传封面',sizes:'实际尺寸'};
let overviewMode='light',scene='identity',current='p1',compareIds=['p1','g1'];
const file=(f,name)=>`assets/${f.id}-${name}`;
const im=(src,alt,cls='',extra='')=>`<img src="${src}" alt="${alt}" class="${cls}" ${extra}>`;
function vars(f){return `--paper:${f.paper};--night:${f.night};--ink:${f.ink}`}
const colors=f=>`<div class="color-info">${[[f.main,'主色'],[f.accent,'浅底叠页'],[f.darkArc,'深底叠页'],[f.tile.bg,'图标底色']].map(([c,n])=>`<span><i style="background:${c}"></i>${n} ${c}</span>`).join('')}</div>`;
function renderCards(){
 $('#cards').innerHTML=families.map(f=>`<article class="family-card" style="${vars(f)}"><div class="card-art ${overviewMode}">${im(file(f,`horizontal-${overviewMode}.svg`),f.name+'完整标识','lockup')}<div class="mini-strip">${im(file(f,`mark-original-${overviewMode}.svg`),'透明鱼形','fish')}${im(file(f,'tile.svg'),'应用图标')}<div class="swatches">${[f.main,f.darkArc,f.paper].map(c=>`<span style="background:${c}" title="${c}"></span>`).join('')}</div></div></div><div class="card-caption"><div class="card-number">${f.no} / ${f.line}</div><h3>${f.name}</h3><p>${f.tag}</p><div class="card-actions"><button data-inspect="${f.id}">查看整套 →</button><button data-compare="${f.id}" aria-pressed="${compareIds.includes(f.id)}">${compareIds.includes(f.id)?'已加入对比':'加入对比'}</button></div></div></article>`).join('');
}
function hostMock(f,mode){return `<div class="ui-scene ${mode}"><div class="ui-label">主页面顶部 · 品牌配色示意，功能区保持中性</div><div class="mock-window"><div class="mock-header"><div class="mock-brand">${im(file(f,`mark-d1-${mode}.svg`),'24像素入口')}肥鱼笔记</div><div class="mock-nav"><b>笔记</b><span>笔记本管理</span><span>设置</span></div></div><div class="mock-content"><div class="mock-list"><b>我的 AI 使用笔记</b><div class="active">把好用的提问方法留下</div><div>长文阅读与摘要核对</div><div>给图片修改补充边界</div><div>从会话整理成说明</div></div><div class="mock-note"><h4>把好用的提问方法留下</h4><p>这次回答效果不错，把当时的背景和有效约束一起记下，下次就能接着用。</p><div class="callout">先说明要完成的事，再给材料；不确定的地方，请明确标注。</div><p>保留原始会话，整理成自己的表达。把真正有帮助的方法，放进常用笔记。</p></div></div></div><div class="ui-label">会话侧栏 · 彩色透明鱼形</div><div class="sidebar-mock"><div class="mock-header"><div class="mock-brand">${im(file(f,`mark-d2-${mode}.svg`),'16像素侧栏入口','', 'style="width:16px;height:12px"')}会话笔记</div><span style="margin-left:auto">＋　↗</span></div><div class="sidebar-body"><b>阅读长文时，先核对这三件事</b><p>结论是否有原文依据？有没有遗漏条件？哪些地方仍需查证？</p><div class="attachment">阅读核对清单.md <span style="float:right">1.2 KB</span></div></div></div><div class="host-entry"><span style="display:inline-block;width:16px;height:13px;background:currentColor;mask:url('${file(f,`mark-d2-${mode}.svg`)}') center/contain no-repeat"></span>肥鱼笔记 <span style="margin-left:auto">宿主导航：仍按 DSH 规则使用单色</span></div></div>`}
function content(f,s,mode){
 const wrap=inner=>`<div class="scene-surface ${mode}" style="${vars(f)}">${inner}</div>`;
 if(s==='identity')return wrap(`<div class="identity-pair">${im(file(f,`stack-${mode}.svg`),'竖式完整标识','stack')}<div class="identity-right">${im(file(f,`horizontal-${mode}.svg`),'横式完整标识','horizontal')}${colors(f)}</div></div>`);
 if(s==='mark')return wrap(`<div class="symbols"><figure>${im(file(f,`mark-original-${mode}.svg`),'原版透明鱼形','mark-large')}<figcaption>透明图形 · 原版</figcaption></figure><figure>${im(file(f,'tile.svg'),'D1应用方块')}<figcaption>应用方块 · D1</figcaption></figure><figure>${im(file(f,'tile-original.svg'),'原版应用方块')}<figcaption>原版结构对照</figcaption></figure></div><p class="size-tip">结构对照只用于观察同一配色，不代表替换已确认的小尺寸分工。</p>`);
 if(s==='ui')return hostMock(f,mode);
 if(s==='cover')return `<div class="scene-surface cover-surface ${mode}" style="${vars(f)}">${im(file(f,`cover-${mode}.svg`),'宣传封面配色示意','cover-img')}</div>`;
 if(s==='taskbar'){
  const hasPrior=['p1','g1'].includes(f.id);
  const prior=hasPrior?`<h4>上一轮实拍 · 选中状态 · 原尺寸</h4><div class="taskbar-scroll">${im(`evidence/${f.id}-active-prior.png`,f.name+'上一轮选中任务栏实拍')}</div><h4>上一轮实拍 · 未选中状态 · 原尺寸</h4><div class="taskbar-scroll">${im(`evidence/${f.id}-inactive-prior.png`,f.name+'上一轮未选中任务栏实拍')}</div><p>与上一轮的 32 px 图源逐像素一致，因此保留对应实拍作参考；没有把旧图当成本轮新拍。拍摄使用临时原生清晰图像实验，尚未接入插件。</p>`:`<p class="capture-pending">本套尚无可用的真实任务栏实拍。本轮桌面截图返回全黑，已排除这些截图；下面只展示图源在浅深底上的效果。</p>`;
  return `<div class="taskbar-scene">${prior}<h4>六套 32 px 图源并排 · 背景示意，非系统截图</h4><div class="taskbar-model dark">${families.map(x=>im(file(x,'tile-32.png'),x.name,'',`width="32" height="32" title="${x.name}" srcset="${file(x,'tile-32.png')} 1x, ${file(x,'tile-64.png')} 2x"`)).join('')}</div><div class="taskbar-model light">${families.map(x=>im(file(x,'tile-32.png'),x.name,'',`width="32" height="32" title="${x.name}" srcset="${file(x,'tile-32.png')} 1x, ${file(x,'tile-64.png')} 2x"`)).join('')}</div><div class="taskbar-zoom"><figure>${im(file(f,'tile-32.png'),'32px原图','',`width="32" height="32" srcset="${file(f,'tile-32.png')} 1x, ${file(f,'tile-64.png')} 2x"`)}<figcaption>32 px 图源</figcaption></figure><figure>${im(file(f,'tile.svg'),'128px放大图','', 'width="128" height="128"')}<figcaption>128 px 放大观察</figcaption></figure></div><p>固定 D1 结构；颜色不会自动解决宿主图标缩放链路中的模糊。实际观感仍以桌面恢复后补拍为准。</p></div>`;
 }
 if(s==='sizes')return wrap(`<div class="sizes-grid"><div class="size-row head"><span>逻辑宽度</span><div>按现有分工</div><div>全用原版作对照</div></div>${[16,20,24,28,32,48,64].map(size=>{const shape=size<=16?'d2':size<=24?'d1':size===28?'c0':'original';return `<div class="size-row"><b>${size} px</b><div>${im(file(f,`mark-${shape}-${mode}.svg`),size+'px '+shape,'',`style="width:${size}px;height:${Math.round(size*.7)}px"`)}<small>${shape==='original'?'原版':shape.toUpperCase()}</small></div><div>${im(file(f,`mark-original-${mode}.svg`),size+'px 原版','',`style="width:${size}px;height:${Math.round(size*.7)}px"`)}</div></div>`}).join('')}</div><p class="size-tip">以上为真实 CSS 尺寸，不是放大的截图。浏览器缩放请保持 100%。这里只比较原有轮廓与新配色，不在本轮重新定小图标结构。</p>`);
}
function renderCompare(){
 $('#compare-picks').innerHTML=families.map(f=>`<label><input type="checkbox" value="${f.id}" ${compareIds.includes(f.id)?'checked':''}>${f.no} ${f.name}</label>`).join('');
 const s=$('#compare-scene').value,mode=$('#compare-mode').value;
 $('#comparison').style.setProperty('--count',Math.max(1,compareIds.length));
 $('#comparison').innerHTML=compareIds.length?compareIds.map(id=>{const f=byId(id);return `<article class="compare-item"><div class="compare-heading">${f.no} ${f.name}</div>${content(f,s,mode)}</article>`}).join(''):'<p>先勾选要放在一起比较的方案。</p>';
 $('#compare-note').textContent=s==='taskbar'?'01 / 04 保留上一轮相同图源的实拍；其余四套暂为背景示意。所有截图保持原尺寸，列宽不足可在图内横向查看。':s==='ui'?'仅比较品牌入口配色；功能区采用同样的中性示意界面。':s==='cover'?'同一版式与文案，仅比较品牌气质。均为设计示意，尚未替换公开素材。':'';
 $('#compare-mode').disabled=s==='taskbar';
}
function renderInspector(){
 const f=byId(current),mode=$('#inspect-mode').value;
 $('#inspect-family').value=current;$('#family-description').textContent=f.desc;
 $('#scene-tabs').innerHTML=Object.entries(scenes).map(([id,label])=>`<button role="tab" aria-selected="${id===scene}" data-scene="${id}">${label}</button>`).join('');
 $('#inspect-mode').disabled=scene==='taskbar';$('#inspection').innerHTML=content(f,scene,mode);
 const links=scene==='cover'?[[`cover-${mode}.png`,'下载封面 PNG'],[`cover-${mode}.svg`,'下载封面 SVG']]:scene==='taskbar'?[[`tile.ico`,'下载候选 ICO'],['tile.svg','下载图标 SVG']]:[[`horizontal-${mode}.svg`,'横式 SVG'],[`stack-${mode}.svg`,'竖式 SVG'],[`mark-original-${mode}.svg`,'透明鱼形 SVG'],['tile.svg','应用方块 SVG']];
 $('#downloads').innerHTML=links.map(([name,text])=>`<a download href="${file(f,name)}">${text} ↓</a>`).join('');
}
$('#inspect-family').innerHTML=families.map(f=>`<option value="${f.id}">${f.no} ${f.name}</option>`).join('');
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{overviewMode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCards()}));
$('#cards').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.inspect){current=b.dataset.inspect;renderInspector();$('#inspect').scrollIntoView({behavior:'smooth'})}if(b.dataset.compare){const id=b.dataset.compare;if(compareIds.includes(id))compareIds=compareIds.filter(x=>x!==id);else if(compareIds.length<3)compareIds.push(id);else{alert('最多同时比较三套，请先取消一套。');return}renderCompare();renderCards()}});
$('#compare-picks').addEventListener('change',e=>{if(!e.target.matches('input'))return;if(e.target.checked&&compareIds.length===3){e.target.checked=false;alert('最多同时比较三套，请先取消一套。');return}compareIds=e.target.checked?[...compareIds,e.target.value]:compareIds.filter(x=>x!==e.target.value);renderCompare();renderCards()});
for(const id of ['compare-scene','compare-mode'])$('#'+id).addEventListener('change',renderCompare);
$('#inspect-family').addEventListener('change',e=>{current=e.target.value;renderInspector()});$('#inspect-mode').addEventListener('change',renderInspector);
$('#scene-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){scene=b.dataset.scene;renderInspector()}});
renderCards();renderCompare();renderInspector();
const history=await fetch('previous-feedback.json').then(r=>r.json());
const h=document.createElement('pre');h.textContent=history.data.notes;$('#history').append(h);const t=document.createElement('time');t.textContent='上一轮首选：12 紫莓薄荷；候选：02 鲜翠、07 薄荷纸、12 紫莓薄荷。保存于 '+new Date(history.updatedAt).toLocaleString('zh-CN');$('#history').append(t);
document.querySelectorAll('select[data-answer]:not([data-answer=consistency])').forEach(el=>{el.insertAdjacentHTML('beforeend',families.map(f=>`<option value="${f.id}">${f.no} ${f.name}</option>`).join(''))});
$('#family-feedback').innerHTML=families.map(f=>`<div class="family-opinion"><header><b>${f.no} ${f.name}</b><label><input type="checkbox" data-answer="keep_${f.id}">保留继续看</label></header><textarea rows="2" data-answer="note_${f.id}" aria-label="${f.name}的意见" placeholder="喜欢什么，想改什么？"></textarea></div>`).join('');
const state=window.createPageState({key:'fatfish-brand-families-20261117',defaults:{},onStatus:({kind})=>{const labels={loading:'正在读取意见…',saving:'正在自动保存…',saved:'意见已保存，可以继续修改。',failed:'尚未保存到项目；浏览器保留草稿，请重试。',browser:'当前仅保存在此浏览器，请使用本地网页地址。'};$('#save-status').textContent=labels[kind];$('#save-status').parentElement.classList.toggle('error',kind==='failed');$('#retry').hidden=kind!=='failed'}});
const saved=await state.ready;document.querySelectorAll('[data-answer]').forEach(el=>{if(el.type==='checkbox')el.checked=saved[el.dataset.answer]===true;else el.value=saved[el.dataset.answer]??''});$('#feedback-fields').disabled=false;
$('#feedback-fields').addEventListener('input',e=>{const el=e.target;if(el.dataset.answer)state.set({[el.dataset.answer]:el.type==='checkbox'?el.checked:el.value})});$('#retry').addEventListener('click',()=>state.retry());
document.body.dataset.ready='true';
