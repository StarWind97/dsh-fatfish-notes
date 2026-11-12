// Run against an already-open isolated DSH page. The caller owns startup/cleanup.
// Uses the real React editor and list, covering the boundary absent from controller tests.
const assert=require('node:assert/strict');
const button=(root,name)=>root.getByRole('button',{name,exact:true});
async function cancelNew(page,{withText=false,workspace=false}={}){
  const side=page.locator('.conversation-notes'),list=side.locator('.conversation-notes-list');
  await list.locator(':scope[aria-busy=false]').waitFor();
  const before={tab:await side.locator('.conversation-notes-tabs [aria-pressed=true]').innerText(),rows:await side.locator('.conversation-note-row').allTextContents(),scroll:await list.evaluate(el=>el.scrollTop),search:await side.getByRole('searchbox').count()?await side.getByRole('searchbox').inputValue():null,source:await side.locator('.conversation-linked-filter [aria-pressed=true]').allTextContents()};
  await button(side,workspace?'在工作区笔记本新建笔记':'新建笔记').click();
  await side.locator('.cm-content[contenteditable=true]').waitFor();
  if(withText){await side.locator('.paper-title-input').fill('取消新建回归 · 不保存');await side.locator('.paper-stamp [role=status]').filter({hasText:'草稿已保存到本机'}).waitFor();}
  await button(side.locator('.paper-doc-head'),'取消').click();
  if(withText)await button(page.getByRole('dialog',{name:'放弃本次编辑？',exact:true}),'放弃修改').click();
  await side.getByRole('navigation',{name:'会话笔记',exact:true}).waitFor();
  assert.equal(await side.locator('.conversation-notes-tabs [aria-pressed=true]').innerText(),before.tab,'cancel returns to the originating tab');
  assert.equal(await side.locator('.conversation-notes-head strong button').count(),0,'no stale detail/back state');
  assert.deepEqual(await side.locator('.conversation-note-row').allTextContents(),before.rows,'same loaded rows and order');
  assert.ok(Math.abs(await list.evaluate(el=>el.scrollTop)-before.scroll)<=1,'list scroll restored');
  assert.equal(await side.getByRole('searchbox').count()?await side.getByRole('searchbox').inputValue():null,before.search);
  assert.deepEqual(await side.locator('.conversation-linked-filter [aria-pressed=true]').allTextContents(),before.source);
  return {origin:before.tab,withText,rows:before.rows.length,scroll:before.scroll};
}
async function cancelRename(page){
  const d=page.getByRole('dialog',{name:'工作区笔记本设置',exact:true});
  const original=await d.locator('.workspace-book-current strong').innerText();
  assert.equal(await d.getByRole('combobox').count(),0,'initial settings are collapsed');
  await button(d,'重命名笔记本').click();
  const input=d.getByRole('textbox',{name:'修改笔记本名称',exact:true});
  assert.equal(await input.locator('xpath=ancestor::*[contains(@class,"workspace-book-current")]').count(),1,'rename stays in current-name row');
  await input.fill(original+' · 尚未确认');
  assert.equal(await button(d,'保存名称').getAttribute('title'),'保存名称');
  assert.equal(await button(d,'取消改名').getAttribute('title'),'取消改名');
  await page.keyboard.press('Escape');
  assert.equal(await d.isVisible(),true,'first Escape leaves the dialog open');
  assert.equal(await d.locator('.workspace-book-current strong').innerText(),original);
  assert.equal(await d.getByRole('textbox').count(),0);
  await button(d,'选用其他笔记本').click();await d.getByRole('combobox').waitFor();
  await button(d,'取消选用').click();assert.equal(await d.getByRole('combobox').count(),0);
  await button(d,'新建笔记本').click();await d.getByRole('textbox',{name:'笔记本名称',exact:true}).fill('不应创建');
  assert.equal(await button(d,'创建并关联工作区').getAttribute('title'),'创建并关联工作区');
  await button(d,'取消新建').click();assert.equal(await d.getByRole('textbox').count(),0);
  await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});
  return {inline:true,escapeLevels:true,selectionCancelled:true,creationCancelled:true};
}
module.exports={cancelNew,cancelRename};
