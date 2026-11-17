// A focused, independent review. Display controls never write preference answers.
export function renderStableReview(){
 const root=document.querySelector('#stable-review');
 const image=(name,alt,extra='')=>`<img src="assets/p3-${name}" alt="${alt}" ${extra}>`;
 const asset=(stem,mode,ext='svg')=>`${stem}-${mode==='light'?'light':'stable-dark'}.${ext}`;
 const mark=(mode,size)=>image(asset(`mark-${size<=17?'d2':size<=24?'d1':size===28?'c0':'original'}`,mode),`${size} px 鱼形`,`width="${size}" height="${Math.round(size*.7)}"`);
 let scene='identity';
 const scenes={identity:'完整标识',ui:'界面入口',sizes:'实际尺寸',cover:'宣传封面'};
 function ui(mode){return `<div class="stable-ui">
  <p class="stable-caption">主页面／独立窗口 · 20 px</p><div class="stable-ui-header">${mark(mode,20)}<b>肥鱼笔记</b><span>笔记　笔记本管理　设置</span></div>
  <div class="stable-note"><span class="stable-muted">我的 AI 使用笔记 / 常用方法</span><h4>把有用的回答，整理成下次能用的笔记</h4><p>保存当时的问题、有效的约束和关键结论。再次遇到类似任务时，不必从头组织背景。</p><div class="stable-callout">先保留会话，再整理成自己的表述。</div></div>
  <p class="stable-caption">会话侧栏 · 17 px</p><div class="stable-ui-header">${mark(mode,17)}<b>会话笔记</b><span>＋　↗</span></div><div class="stable-sidebar-note"><b>长文阅读：先核对这三件事</b><p>原文依据、适用条件、仍待确认的问题。</p><div>阅读核对清单.md <span>1.2 KB</span></div></div>
  <p class="stable-caption">DSH 导航 · 16 px 单色，继承宿主</p><div class="stable-host"><i style="mask:url('assets/p3-mark-d2-light.svg') center/contain no-repeat"></i>肥鱼笔记</div></div>`}
 function view(mode){
  if(scene==='identity')return `<div class="stable-identity">${image(asset('horizontal',mode),'横式完整标识','class="stable-horizontal"')}<div class="stable-identity-bottom">${image(asset('stack',mode),'竖式完整标识','class="stable-stack"')}<div class="stable-symbols">${mark(mode,64)}<p>透明鱼形</p>${image('tile.svg','固定配色应用方块','width="48" height="48"')}<p>应用方块</p></div></div></div>`;
  if(scene==='ui')return ui(mode);
  if(scene==='cover')return image(asset('cover',mode),'宣传封面示意','class="stable-cover"');
  return `<div class="stable-size-list">${[16,17,20,24,28,32,48,64].map(size=>`<div><span>${size} px</span>${mark(mode,size)}<small>${size<=17?'D2':size<=24?'D1':size===28?'C0':'原版'}</small></div>`).join('')}</div><p class="stable-size-tip">按实际 CSS 尺寸显示；浏览器缩放保持 100%。上弧与鱼身在明暗两侧使用完全相同的颜色。</p>`;
 }
 function render(){
  root.querySelector('#stable-tabs').innerHTML=Object.entries(scenes).map(([id,label])=>`<button type="button" data-stable-scene="${id}" aria-pressed="${scene===id}">${label}</button>`).join('');
  root.querySelector('#stable-pair').innerHTML=['light','dark'].map(mode=>`<article class="stable-panel ${mode}"><header><b>${mode==='light'?'浅色环境':'深色环境'}</b><span>${mode==='light'?'原来的莓紫与春芽绿':'同色鱼形 · 暖白字标'}</span></header><div class="stable-stage" data-stable-mode="${mode}">${view(mode)}</div><div class="stable-downloads">${(scene==='sizes'?[['mark-d2','16–17 px'],['mark-d1','20–24 px'],['mark-c0','28 px'],['mark-original','原版']]:scene==='cover'?[['cover','封面 SVG']]:[['horizontal','横式 SVG'],['stack','竖式 SVG'],['mark-original','鱼形 SVG']]).map(([stem,label])=>`<a download href="assets/p3-${asset(stem,mode)}">${label} ↓</a>`).join('')}${scene==='cover'?`<a download href="assets/p3-${asset('cover',mode,'png')}">封面 PNG ↓</a>`:''}</div></article>`).join('');
 }
 root.innerHTML=`<div class="section-head"><div><span class="eyebrow">FOCUS / BERRY & SPRING</span><h2>莓紫春芽 · 一套稳定的配色</h2></div><a class="small" href="#dark-purple">回看前一轮深色方案 ↓</a></div>
 <p class="stable-lead">鱼身保持莓紫，上弧保持春芽绿。明暗切换时，优先调整文字，让图形仍是熟悉的样子。</p>
 <p class="muted small">依据你对浅色版的阶段偏好制作；这是整套候选预览，尚未选定或接入插件。</p>
 <div id="stable-tabs" class="stable-tabs" role="group" aria-label="稳定配色预览场景"></div><div id="stable-pair" class="stable-pair"></div>
 <div class="stable-rule-strip"><div><i style="background:#A337A0"></i><span>鱼身 / #A337A0<br><small>明暗保持原色</small></span></div><div><i style="background:#529849"></i><span>叠页 / #529849<br><small>明暗保持原色</small></span></div><div><i class="stable-ink-swatch"></i><span>字标 / 深莓 → 暖白<br><small>只随背景调整深浅</small></span></div></div>
 <div class="stable-taskbar"><div><span class="eyebrow">ONE FIXED APP ICON</span><h3>任务栏始终用这一枚</h3><p>莓紫方块、暖白鱼、浅绿叠页。方块自带底色，放在浅色或深色任务栏上都保持同款。</p><p class="muted small">这里的浅绿比透明图形更亮，用于分清紫底上的两层。颜色分工固定，不随主题互换。</p><div class="stable-tile-link"><a download href="assets/p3-tile.svg">图标 SVG ↓</a><a download href="assets/p3-tile.ico">图标 ICO ↓</a></div></div><div class="stable-tile-pair">${['light','dark'].map(mode=>`<div class="${mode}">${image('tile-32.png','32 px 应用方块', 'width="32" height="32" srcset="assets/p3-tile-32.png 1x, assets/p3-tile-64.png 2x"')}${image('tile.svg','放大观察应用方块','width="72" height="72"')}<span>32 px / 72 px · 背景示意</span></div>`).join('')}</div></div>
 <details class="stable-history"><summary>查看已有 Windows 任务栏实拍 · 选中与未选中</summary><p class="muted small">图源未变化，复用本轮实拍；Windows 100% 缩放，深色任务栏，肥鱼在最右端。临时清晰图像实验尚未接入正式窗口。下方为连续裁片，没有拼接。</p><div class="stable-captures">${['active','inactive'].map((state,i)=>`<figure><figcaption>${i?'未选中':'选中'}状态 · 原尺寸</figcaption><div class="taskbar-scroll"><img src="evidence/p3-${state}.png" width="608" height="48" alt="莓紫春芽真实任务栏${i?'未选中':'选中'}状态"></div></figure>`).join('')}</div></details>
 <details class="stable-history"><summary>与此前两种深色处理对照</summary><div class="stable-old-grid">${[['stable-dark','本次 · 原莓紫与原绿色'],['dark-neutral','此前 · 提亮粉紫与浅绿'],['dark','最初 · 反白鱼身']].map(([mode,label])=>`<div><p>${label}</p>${image(`horizontal-${mode}.svg`,label)}</div>`).join('')}</div></details>
 <div class="stable-feedback"><h3>本次整套配色意见</h3><p class="muted small">只需判断整体是否舒服、是否像同一套品牌。前几轮意见保留在下方，本次单独记录并自动保存。</p><fieldset id="stable-feedback-fields" disabled><div class="feedback-grid"><label>整体感觉<select data-answer="stable3_overall"><option value="">还没有确定</option><option value="coherent">这套更统一，可以继续细化</option><option value="adjust">方向可以，还需要调整</option><option value="previous">更喜欢此前的方案</option></select></label><label>深色环境中的鱼形<select data-answer="stable3_dark"><option value="">还没有确定</option><option value="keep">原色可以，保持这样</option><option value="lift">稍显暗，希望小幅提亮</option><option value="other">另有想法，见补充说明</option></select></label></div><label class="notes-label">补充说明<textarea rows="3" data-answer="stable3_notes" placeholder="最舒服或最别扭的是哪里？任务栏、透明图形和完整标识放在一起，是否协调？"></textarea></label></fieldset><div class="save-row"><span id="stable-save-status" role="status">正在读取意见…</span><button id="stable-retry" hidden>重试保存</button></div><p class="muted small">意见保存在本机项目，刷新或换浏览器可读回；保存不会自动启动接入或发布。填写完后在会话告诉我即可。</p></div>`;
 root.querySelector('#stable-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-stable-scene]');if(!b)return;scene=b.dataset.stableScene;render();root.querySelector(`[data-stable-scene=${scene}]`).focus({preventScroll:true})});
 root.querySelector('.stable-history').addEventListener('toggle',e=>{if(e.target.open)e.target.querySelectorAll('.taskbar-scroll').forEach(el=>el.scrollLeft=el.scrollWidth)});
 const captureResize=new ResizeObserver(entries=>{for(const {target} of entries)if(target.clientWidth)target.scrollLeft=target.scrollWidth});
 root.querySelectorAll('.stable-captures .taskbar-scroll').forEach(el=>captureResize.observe(el));
 render();
}
