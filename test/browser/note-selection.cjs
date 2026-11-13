// Exercise the real mounted React list; the caller owns the isolated host and selection mode.
const assert=require('node:assert/strict');
async function noteSelection(page,root,{pollNoteId}={}){
 const heading=root.locator('.paper-leaf h1').first(),title=await heading.count()?await heading.textContent():null;
 const rows=root.locator('.paper-selection-hit');await rows.first().waitFor();const labels=await rows.locator('strong').allTextContents();const index=labels.findIndex(label=>label.trim()!==title?.trim());
 const row=rows.nth(Math.max(0,index)),box=row.getByRole('checkbox');
 const opened=[];let backgroundReads=0;const listen=r=>{if(r.url().endsWith('/notes/get')){const id=JSON.parse(r.postData()).noteId;if(pollNoteId&&id===pollNoteId)backgroundReads++;else opened.push(id)}};page.on('request',listen);
 const before=await root.locator('.paper-reading .note-markdown').allTextContents();const samples=[];
 try{
  if(await box.isChecked())await box.uncheck();
  for(const target of [row.locator('strong'),row.locator('small'),row.locator('.paper-row,.conversation-note-row'),row,box]){
   const start=Date.now();await target.first().click(target===row?{position:{x:2,y:2}}:{});await box.waitFor();assert.equal(await box.isChecked(),true);samples.push(Date.now()-start);await box.uncheck();
  }
  await box.focus();await page.keyboard.press('Space');assert.equal(await box.isChecked(),true);await page.keyboard.press('Enter');assert.equal(await box.isChecked(),false);
  await row.locator('strong').dblclick();assert.equal(await box.isChecked(),true,'double click selects once');await box.uncheck();
  await box.dblclick();assert.equal(await box.isChecked(),true,'double click on checkbox selects once');
  await row.click({button:'right'});assert.equal(await root.locator('.paper-select-row .paper-row-more,.conversation-notes-list .paper-row-more').count(),0);assert.equal(await page.locator('.paper-row-menu').count(),0);
  assert.deepEqual(await root.locator('.paper-reading .note-markdown').allTextContents(),before);assert.deepEqual(opened,[],'selection must not request a different note body');
  await box.uncheck();return {samples,keyboard:true,doubleClick:true,noOpen:true,noSingleMenu:true,backgroundReads};
 }finally{page.off('request',listen)}
}
module.exports={noteSelection};
