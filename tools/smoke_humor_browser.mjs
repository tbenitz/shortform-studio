/** Browser-level regression: SRT-backed humor candidates, manual compilation and fullscreen. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
await stat('_site/humor-test.webm');
const server=spawn('python3',['-m','http.server','8798','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 for(let i=0;i<25;i++){try{await page.goto('http://127.0.0.1:8798/',{waitUntil:'domcontentloaded',timeout:2500});break}catch(e){if(i===24)throw e;await new Promise(r=>setTimeout(r,200))}}
 await page.locator('#fileUpload').setInputFiles('_site/humor-test.webm');
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length===1,null,{timeout:12000});
 await page.locator('button[data-tab="transcript"]').click();
 const srt='1\n00:00:00,400 --> 00:00:02,800\nNo way you just crashed our helicopter into a tree!\n\n2\n00:00:03,200 --> 00:00:06,000\nDude are you kidding me that was hilarious!\n\n3\n00:00:08,000 --> 00:00:10,500\nThe installation documentation covers configuration parameters.\n';
 await page.locator('#srtUpload').setInputFiles({name:'source-jokes.srt',mimeType:'text/plain',buffer:Buffer.from(srt)});
 await page.waitForFunction(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();return data?.words?.length>=15;
 },null,{timeout:12000});
 await page.locator('button[data-tab="humor"]').click();
 await page.locator('#humorFindLocal').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-preview]').length>=1,null,{timeout:12000});
 const preview=page.locator('[data-humor-preview]').first();
 await preview.click();
 await page.waitForFunction(()=>document.querySelector('#humorPreviewDialog')?.open===true,null,{timeout:4000});
 await page.waitForFunction(()=>document.querySelector('#humorPreviewVideo')?.readyState>=2,null,{timeout:12000});
 await page.locator('#humorPreviewClose').click();
 await page.locator('[data-humor-toggle]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-compilation-up]').length>=1,null,{timeout:5000});
 const dialogueDownload=page.waitForEvent('download',{timeout:10000});
 await page.locator('#humorDownloadSelected').click();
 const dl=await dialogueDownload;
 if(!dl.suggestedFilename().endsWith('.txt'))throw Error('Raw dialogue export did not download TXT');
 const stream=await dl.createReadStream();
 const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const dialogue=Buffer.concat(chunks).toString('utf8');
 if(!/No way|hilarious/i.test(dialogue)||/Local wording|score \d+|source-\d+\.\d+/i.test(dialogue))throw Error('Raw export contains invented captions or meta commentary: '+dialogue);
 await page.locator('#humorBuild').click();
 await page.waitForFunction(()=>document.querySelector('[data-tab="editor"].active')&&document.querySelectorAll('#videoTrack [data-seg]').length>=1,null,{timeout:6000});
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p?.segments?.length===1&&p?.segments?.[0]?.end-p?.segments?.[0]?.start<11&&p?.compilationOrder?.length===1;
 },null,{timeout:12000});
 const result=await page.evaluate(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();
  return {humorCount:data.humorMoments?.length,selected:data.compilationOrder?.length,
   activeClips:document.querySelectorAll('#videoTrack [data-seg]').length,
   sourceRange:data.segments?.[0]&&[data.segments[0].start,data.segments[0].end]};
 });
 if(!(result.sourceRange[1]-result.sourceRange[0]<12))throw Error('Compilation did not trim original footage to selected source range: '+JSON.stringify(result));
 await page.locator('select[data-edit="cropMode"]').selectOption('manual');
 await page.locator('[data-crop-preset="left"]').click();
 const focus=await page.locator('input[data-edit="focusX"]').inputValue();
 if(Math.abs(Number(focus)-.22)>.001)throw Error('Manual speaker crop preset did not update source focus: '+focus);
 await page.locator('#fullscreenPreview').click();
 await page.waitForFunction(()=>document.fullscreenElement?.id==='previewStage',null,{timeout:5000});
 await page.locator('#exitFullscreenPreview').click();
 await page.waitForFunction(()=>document.fullscreenElement===null,null,{timeout:5000});
 await page.locator('#saveProject').click();
 await page.waitForTimeout(1100);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#loadLastProject')?.disabled===false,null,{timeout:10000});
 await page.locator('#loadLastProject').click();
 await page.locator('button[data-tab="humor"]').click();
 const stored=await page.evaluate(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();
  return {clips:data.segments?.length,chosen:data.compilationOrder?.length,moments:data.humorMoments?.length,mode:data.segments?.[0]?.cropMode};
 });
 if(stored.chosen!==1||stored.moments<1||stored.mode!=='manual')throw Error('Saved humor selection or crop mode missing: '+JSON.stringify(stored));
 if(errors.length)throw Error('Unhandled browser errors: '+errors.join(' | '));
 console.log('PASS: local SRT humor candidates, raw TXT, source modal, chosen compilation, crop, fullscreen and persistence '+JSON.stringify(stored));
}finally{await browser?.close();server.kill('SIGTERM')}
