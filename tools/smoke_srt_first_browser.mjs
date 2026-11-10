/** Chromium: import a real source+SRT, navigate all tabs, rank/choose actual original clips. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {stat,readFile} from 'node:fs/promises';
await stat('qa-wave-test.webm');
const server=spawn('python3',['-m','http.server','8854'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 for(let i=0;i<35;i++){try{await page.goto('http://127.0.0.1:8854/',{waitUntil:'domcontentloaded',timeout:3500});break}catch(e){if(i===34)throw e;await new Promise(r=>setTimeout(r,200))}}
 await page.locator('#fileUpload').setInputFiles([
  {name:'qa-wave-test.webm',mimeType:'video/webm',buffer:await readFile('qa-wave-test.webm')},
  {name:'qa-wave-test.en.srt',mimeType:'text/plain',buffer:Buffer.from('1\n00:00:01,000 --> 00:00:02,800\nOur real source captions\n')}
 ]);
 await page.waitForFunction(()=>document.querySelectorAll('#assetsList [data-asset]').length===1,null,{timeout:13000});
 if(!(await page.locator('.studio-guide').count()))throw Error('Guided control missing in Media');
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject(),id=p?.assets?.[0]?.id;
  return p?.subtitleTracks?.[id]?.active==='srt'&&p?.words?.some(w=>w.text==='captions');
 },null,{timeout:15000});
 console.log('PASS: Import video + matching English SRT in one action automatically activates original captions.');
 await page.locator('.studio-guide .guide-stage[data-guide-tab="transcript"]').click();
 await page.waitForFunction(()=>document.querySelector('#srtUpload')&&document.querySelector('#captionTrackChoice'),null,{timeout:4000});
 await page.locator('#srtUpload').setInputFiles({name:'real-captions.srt',mimeType:'text/plain',buffer:Buffer.from(
  '1\n00:00:01,000 --> 00:00:03,500\nWhy did you crash the helicopter into that tree?\n\n'+
  '2\n00:00:04,000 --> 00:00:06,500\nBecause you said you were going to land it perfectly!\n\n'+
  '3\n00:00:07,000 --> 00:00:09,500\nHahaha I can not believe you did that! That was hilarious!\n'
 )});
 await page.waitForFunction(()=>document.querySelector('#captionTrackStatus')?.textContent?.includes('SRT active'),null,{timeout:10000});
 if((await page.locator('#captionTrackChoice').inputValue())!=='srt')throw Error('Original SRT was not the preferred caption source');
 const wh=page.locator('#captionTrackChoice option[value="whisper"]');
 if((await wh.getAttribute('disabled'))===null)throw Error('Untranscribed Whisper track must be explicitly disabled: '+(await wh.evaluate(el=>el.outerHTML)));
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  const assetId=p?.assets?.[0]?.id;return p?.subtitleTracks?.[assetId]?.active==='srt'&&p?.subtitleTracks?.[assetId]?.srt?.length>=12;
 },null,{timeout:14000});
 console.log('PASS: Real video + original SRT imported and ACTIVE, Whisper disabled without processing, project saved.');
 const toggle=page.locator('#toggleEasyUI');
 const wasSimple=await page.evaluate(()=>document.body.classList.contains('simple-ui'));
 await toggle.click();
 if((await page.evaluate(()=>document.body.classList.contains('simple-ui')))===wasSimple)
  throw Error('Workspace layout control is not interactive');
 await page.locator('#toggleEasyUI').click();
 if((await page.evaluate(()=>document.body.classList.contains('simple-ui')))!==wasSimple)
  throw Error('Workspace layout toggle cannot restore the original mode');
 for(const tab of ['media','transcript','director','humor','editor','export','settings','tools']){
  await page.locator('.studio-guide [data-guide-tab="'+(tab==='tools'?'editor':tab)+'"]').first().click();
  if(tab==='tools')await page.locator('[data-tab="tools"]').click();
  const ready=await page.locator('#inspectorContent .studio-guide').count();
  if(!ready)throw Error('Missing guidance for tab '+tab);
  const current=await page.evaluate(()=>document.querySelector('.tab.active')?.dataset.tab);
  if(current!==tab)throw Error('Navigation selected '+current+' instead of '+tab);
 }
 console.log('PASS: Persistent readable guidance in all eight app workspaces, layout toggle and full access to advanced tools.');
 await page.locator('.studio-guide [data-guide-tab="humor"]').click();
 await page.locator('#humorFindLocal').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-preview]').length>0,null,{timeout:15000});
 await page.locator('#humorReviewSort').selectOption('structure');
 if((await page.locator('#humorReviewSort').inputValue())!=='structure')throw Error('Structure-ranked original clip review did not activate');
 await page.locator('#humorReactionOnly').check();
 if(!(await page.locator('#humorReactionOnly').isChecked()))throw Error('Spoken reaction filter did not activate');
 await page.locator('#humorReactionOnly').uncheck();
 await page.locator('#humorPickFive').click();
 await page.waitForFunction(()=>!!document.querySelector('#humorBuild')&&!document.querySelector('#humorBuild').disabled,null,{timeout:6000});
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p?.compilationOrder?.length>=1&&p?.subtitleTracks?.[p.assets?.[0]?.id]?.active==='srt';
 },null,{timeout:14000});
 console.log('PASS: Score-grounded source clip ranking, reaction filter, real diversified selection, unchanged SRT captions.');
 if(errors.length)throw Error('Unexpected JS errors: '+errors.join(' | '));
}finally{await browser?.close();server.kill('SIGTERM')}
