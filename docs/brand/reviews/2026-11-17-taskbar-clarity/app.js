(async()=>{
 const {palettes}=await(await fetch('palettes.json')).json();
 const $=s=>document.querySelector(s);
 const image=(src,size,alt='')=>`<img src="${src}" ${[16,20,24,32,48].includes(size)?`srcset="${src.replace(/-\d+\.png$/,`-${size*2}.png`)} 2x"`:''} width="${size}" height="${size}" alt="${alt}">`;
 $('#dpr').textContent=window.devicePixelRatio+'×';
 $('#palettes').innerHTML=palettes.map(p=>`<article class="palette-card" data-bg="both"><div class="card-copy"><h3>${p.name}</h3><p>${p.desc}</p><div class="swatches">${[p.bg,p.arc,p.body].map(c=>`<span class="swatch"><i class="dot" style="background:${c}"></i>${c}</span>`).join('')}</div></div>${['light','dark'].map(bg=>`<div class="surface ${bg}">${image(`assets/${p.id}-256.png`,80,p.name)}<div class="size-row">${[16,20,24,32,48].map(s=>`<div class="size-item">${image(`assets/${p.id}-${s}.png`,s)}<span>${s}</span></div>`).join('')}</div></div>`).join('')}</article>`).join('');
 $('#surface').addEventListener('change',e=>document.querySelectorAll('.palette-card').forEach(c=>c.dataset.bg=e.target.value));
 $('#pixel-proof').innerHTML=[['源图 · 32 px','assets/current-32.png'],['当前窗口输出','evidence/current-native.png'],['直供原生图 · 实验','evidence/current-direct-native.png']].map(([label,src])=>`<div class="proof"><p>${label}</p><img class="actual" src="${src}" alt="${label}实际大小"><img class="zoom" src="${src}" alt="${label}像素放大"></div>`).join('');
 function renderShots(){const mode=$('#capture-mode').value;$('#taskbar-rows').innerHTML=palettes.map(p=>`<div class="taskbar-row"><div><h3>${p.name}</h3><span>${p.bg}</span></div><button class="shot-button" aria-label="查看${p.name}任务栏原图"><img class="taskbar-shot" src="evidence/${p.id}-${mode}.png" width="688" height="48" alt="${p.name}真实任务栏，肥鱼图标位于最右侧"></button></div>`).join('');document.querySelectorAll('.shot-button').forEach(b=>b.addEventListener('click',()=>{const d=$('#image-dialog');d.querySelector('img').src=b.querySelector('img').src;d.showModal()}))}
 $('#capture-mode').addEventListener('change',renderShots);renderShots();
 $('.close-dialog').addEventListener('click',()=>$('#image-dialog').close());$('#image-dialog').addEventListener('click',e=>{if(e.target===$('#image-dialog'))$('#image-dialog').close()});
 $('#choices').innerHTML='<legend>哪一组更适合用作应用图标？</legend>'+[...palettes.map(p=>[p.id,p.name]),['adjust','还需调整']].map(([value,label])=>`<label class="choice"><input type="radio" name="palette" value="${value}" disabled>${label}</label>`).join('');
 const messages={loading:'正在读取本轮意见…',saving:'正在保存…',saved:'意见已保存，可以继续修改。',failed:'尚未写入本机记录，请重试。',browser:'当前仅保存在这个浏览器中。'};
 const store=createPageState({key:'fatfish-taskbar-clarity-20261117',defaults:{palette:'',notes:''},onStatus:({kind})=>{$('#save-status').textContent=messages[kind]||kind;$('#retry').hidden=kind!=='failed'}});
 const initial=await store.ready;
 document.querySelectorAll('[name=palette]').forEach(el=>{el.checked=el.value===initial.palette;el.disabled=false;el.addEventListener('change',()=>store.set({palette:el.value}))});
 $('#notes').value=initial.notes||'';$('#notes').disabled=false;$('#notes').addEventListener('input',()=>store.set({notes:$('#notes').value}));$('#retry').addEventListener('click',()=>store.retry());
})().catch(e=>{document.querySelector('#save-status').textContent='页面加载失败，请刷新重试。';console.error(e)});
