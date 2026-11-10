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
 const srt='1\n00:00:00,400 --> 00:00:02,800\nNo way you just crashed our helicopter into a tree!\n\n2\n00:00:03,200 --> 00:00:06,000\nDude are you kidding me that was hilarious!\n\n3\n00:00:08,000 --> 00:00:10,500\nThe installation documentation covers configuration parameters.\n\n4\n00:00:21,000 --> 00:00:24,000\nThe helicopter crashed into another tree! The pilot is a clown!\n';
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
 await page.locator('[data-humor-reject]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-restore]').length===1,null,{timeout:7000});
 const rejects=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p?.humorRejected?.length||0;
 });
 // Do not rely on autosave timing to decide whether the live UI rejection worked.
 const showRejected=page.locator('summary').filter({hasText:'Rejected funny moments'});
 await showRejected.click();
 await page.locator('[data-humor-restore]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-reject]').length>=2,null,{timeout:7000});
 console.log('PASS: manual Not Funny rejection, reversible recovery UI and source-linked original candidates retained');
 await page.locator('[data-humor-toggle]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-compilation-up]').length>=1,null,{timeout:5000});
 // Transcript-grounded filtering, persisting open controls and real evidence export.
 await page.locator('#humorFiltersPanel > summary').click();
 await page.locator('#humorSearch').fill('helicopter');
 await page.waitForFunction(()=>document.querySelectorAll('[data-humor-preview]').length>=1,null,{timeout:6000});
 if((await page.locator('#humorFiltersPanel').getAttribute('open'))===null)throw Error('Filter pane unexpectedly collapsed while typing');
 await page.locator('#humorSort').selectOption('score');
 await page.locator('#humorSearch').fill('');
 await page.locator('#storyWorkbench > summary').click();
 await page.waitForFunction(()=>document.querySelector('#storyWorkbench')?.open&&document.querySelector('#humorExportEditPlan'),null,{timeout:6000});
 const planEvent=page.waitForEvent('download',{timeout:10000});
 await page.locator('#humorExportEditPlan').click();
 const sourcePlan=await planEvent,planStream=await sourcePlan.createReadStream(),planParts=[];
 for await(const chunk of planStream)planParts.push(chunk);
 const sourcePlanData=JSON.parse(Buffer.concat(planParts).toString('utf8'));
 if(sourcePlanData.format!=='shortform-source-story-plan'||sourcePlanData.selections.length!==1||
    sourcePlanData.review.visualVerification!==false||!sourcePlanData.selections[0].assetId)
  throw Error('Evidence-backed edit plan did not preserve actual source intervals / uncertainties');
 console.log('PASS: optional spoken-dialogue search, score sort, preserved reviewer and real source evidence edit-plan download');

 const dialogueDownload=page.waitForEvent('download',{timeout:10000});
 await page.locator('#humorDownloadSelected').click();
 const dl=await dialogueDownload;
 if(!dl.suggestedFilename().endsWith('.txt'))throw Error('Raw dialogue export did not download TXT');
 const stream=await dl.createReadStream();
 const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const dialogue=Buffer.concat(chunks).toString('utf8');
 if(!/No way|hilarious/i.test(dialogue)||/Local wording|score \d+|source-\d+\.\d+/i.test(dialogue))throw Error('Raw export contains invented captions or meta commentary: '+dialogue);
 // IndexedDB autosave is debounced: explicitly persist the selected clip before reading it.
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();return p?.compilationOrder?.length===1;
 },null,{timeout:12000});
 const beforeBuild=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return {moments:p?.humorMoments?.map(m=>({start:m.start,end:m.end,dialogue:m.dialogue?.slice(0,90)})),chosen:p?.compilationOrder};
 });
 console.log('Selected SRT source ranges before build: '+JSON.stringify(beforeBuild));
 // User can give a short suggestion breathing room before it goes into the edit.
 const beforeContext=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  const selected=p.humorMoments.find(m=>m.id===p.compilationOrder[0]);return {start:selected?.start,end:selected?.end};
 });
 const selectedMomentId=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();return p.compilationOrder[0];
 });
 await page.locator('[data-humor-expand="'+selectedMomentId+'"]').first().click();
 await page.locator('#saveProject').click();
 await page.waitForFunction(async({id,original})=>{
  const p=await (await import('./src/storage.js')).loadProject(),m=p?.humorMoments?.find(m=>m.id===id);
  return m&&(m.start<original.start-.01||m.end>original.end+.01);
 },{id:selectedMomentId,original:beforeContext},{timeout:12000});
 const afterContext=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  const selected=p.humorMoments.find(m=>m.id===p.compilationOrder[0]);return {start:selected?.start,end:selected?.end};
 });
 if(!(afterContext.start<=beforeContext.start&&afterContext.end>=beforeContext.end))
  throw Error('Suggested funny clip context did not extend the selected source range: '+JSON.stringify({beforeContext,afterContext}));
 console.log('PASS: +5s original joke context edited the real compilation source range');
 await page.locator('#humorBuild').click();
 await page.waitForFunction(()=>document.querySelector('[data-tab="editor"].active')&&document.querySelectorAll('#videoTrack [data-seg]').length>=1,null,{timeout:6000});
 await page.waitForFunction(()=>document.querySelector('#toastArea')?.textContent?.includes('Compilation built from'),null,{timeout:8000});
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p?.segments?.length===1&&p?.segments?.[0]?.end-p?.segments?.[0]?.start>2&&p?.compilationOrder?.length===1;
 },null,{timeout:12000});
 const result=await page.evaluate(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();
  return {humorCount:data.humorMoments?.length,selected:data.compilationOrder?.length,
   activeClips:document.querySelectorAll('#videoTrack [data-seg]').length,
   sourceRange:data.segments?.[0]&&[data.segments[0].start,data.segments[0].end]};
 });
 if(!(result.sourceRange[1]>result.sourceRange[0]&&result.sourceRange[0]>=0))throw Error('Compilation did not preserve a valid original source interval: '+JSON.stringify(result));
 // Expand the built cut, preserving original video and allowing Undo.
 const endBefore=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();return p.segments[0].end;
 });
 await page.locator('#extendClipAfter5').click();
 await page.locator('#saveProject').click();
 await page.waitForFunction(async(oldEnd)=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p?.segments?.[0]?.end>oldEnd+.01;
 },endBefore,{timeout:12000});
 const afterExtended=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();return p.segments[0].end;
 });
 if(!(afterExtended>endBefore+.01))throw Error('Extend clip after button did not extend the actual editor source segment');
 console.log('PASS: Editor +5s after changed real source end boundary, saved project');
 await page.locator('select[data-edit="cropMode"]').selectOption('manual');
 await page.locator('[data-crop-preset="left"]').click();
 const focus=await page.locator('input[data-edit="focusX"]').inputValue();
 if(Math.abs(Number(focus)-.22)>.001)throw Error('Manual speaker crop preset did not update source focus: '+focus);
 // Real drag drawing over the decoded preview: no auto-face scanning required.
 await page.waitForFunction(()=>{
  const c=document.querySelector('#previewCanvas');
  if(!c)return false;
  const ctx=c.getContext('2d');
  const a=ctx.getImageData(Math.floor(c.width*.5),Math.floor(c.height*.5),1,1).data;
  return !(a[0]===9&&a[1]===13&&a[2]===19);
 },null,{timeout:12000});
 await page.locator('#drawCropButton').click();
 await page.waitForFunction(()=>document.querySelector('#previewStage')?.classList.contains('is-drawing-crop'),null,{timeout:6500});
 const canvasBox=await page.locator('#previewCanvas').boundingBox();
 if(!canvasBox||canvasBox.width<50||canvasBox.height<50)throw Error('Video preview not visible for drawing');
 await page.mouse.move(canvasBox.x+canvasBox.width*.42,canvasBox.y+canvasBox.height*.21);
 await page.mouse.down();
 await page.mouse.move(canvasBox.x+canvasBox.width*.78,canvasBox.y+canvasBox.height*.68,{steps:8});
 if(await page.locator('#cropSelectionBox').isHidden())throw Error('Drag selection rectangle not shown');
 await page.mouse.up();
 await page.waitForFunction(()=>!document.querySelector('#previewStage')?.classList.contains('is-drawing-crop')&&document.querySelector('input[data-edit="zoom"]')?.value>1.5,null,{timeout:10000});
 const zoomAfter=Number(await page.locator('input[data-edit="zoom"]').inputValue());
 if(zoomAfter<=1.5)throw Error('Dragged box failed to zoom selected person: '+zoomAfter);
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const p=await (await import('./src/storage.js')).loadProject(),c=p?.segments?.[0];
  return c?.manualCropBox?.right>c?.manualCropBox?.left&&c.zoom>1.5&&c.cropMode==='manual';
 },null,{timeout:9000});
 console.log('PASS: real mouse-drawn crop rectangle mapped to saved original source framing, zoom='+zoomAfter.toFixed(2));

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
 const drawnCrop=await page.evaluate(async()=>{const p=await (await import('./src/storage.js')).loadProject();return p?.segments?.[0]?.manualCropBox});
 if(!drawnCrop||drawnCrop.right<=drawnCrop.left)throw Error('The manually drawn crop was not restored after refresh');

 // A storyline needs real separate source cuts that share the same topic.
 await page.locator('#humorFindCompilation').click();
 if(!((await page.locator('#humorFindCompilation').getAttribute('class'))||'').includes('primary'))throw Error('Themed compilation mode not selected');
 await page.locator('#humorFindStory').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-story-build]').length>=1,null,{timeout:12000}).catch(async()=>{const status=await page.locator('#humorStatus').innerText();const snap=await page.evaluate(async()=>{const p=await (await import('./src/storage.js')).loadProject();return {moments:p?.humorMoments?.map(m=>({start:m.start,end:m.end,score:m.score,dialogue:m.dialogue?.slice(0,170)})),text:document.querySelector('#inspectorContent')?.innerText.slice(0,900)}});throw Error('No connected story: '+status+' '+JSON.stringify(snap))});
 await page.locator('[data-story-build]').first().click();
 await page.waitForFunction(()=>document.querySelector('[data-tab="editor"].active')&&document.querySelectorAll('#videoTrack [data-seg]').length>=2,null,{timeout:12000});
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();
  return data?.segments?.length>=2&&new Set(data.segments.map(s=>s.assetId)).size===1&&data.segments.every((s,i)=>i===0||s.start>=data.segments[i-1].end);
 },null,{timeout:12000});
 const sourceStory=await page.evaluate(async()=>{
  const data=await (await import('./src/storage.js')).loadProject();
  return data.segments.map(s=>({assetId:s.assetId,start:s.start,end:s.end}));
 });
 console.log('PASS: coherent two-or-more-cut funny story from actual separate same-topic original source windows '+JSON.stringify(sourceStory));
 if(errors.length)throw Error('Unhandled browser errors: '+errors.join(' | '));
 const savedProject=await page.evaluate(async()=>{
  const store=await import('./src/storage.js');const p=await store.loadProject();
  const points=await store.listSnapshots(p.id);
  return {auto:points.filter(x=>x.automatic).length,manual:points.filter(x=>!x.automatic).length};
 });
 if(savedProject.auto<1)throw Error('No real automatic recovery checkpoint was stored after saved project edits');
 console.log('PASS: automatic IndexedDB project recovery checkpoints exist after save '+JSON.stringify(savedProject));
 // Project library, sampled original media identity and verified backups in real Chrome.
 await page.locator('button[data-tab="tools"]').click();
 await page.waitForFunction(()=>document.querySelector('#toolsSaveLibrary'),null,{timeout:8000});
 await page.locator('#toolsVerifySources').click();
 await page.waitForFunction(()=>document.querySelector('#toolsVerifyStatus')?.textContent?.includes('1/1 sampled fingerprints matched'),null,{timeout:12000});
 await page.locator('#toolsSaveLibrary').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-library-load]').length===1,null,{timeout:10000});
 await page.locator('[data-library-copy]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-library-load]').length===2,null,{timeout:10000});
 await page.locator('[data-library-load]').first().click();
 await page.waitForFunction(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  return project?.name?.includes('copy')&&project?.segments?.length>=2;
 },null,{timeout:12000});
 await page.locator('button[data-tab="tools"]').click();
 const originalId=await page.evaluate(async()=>{const p=await (await import('./src/storage.js')).loadProject();return p?.id});
 const dlBackup=page.waitForEvent('download',{timeout:10000});
 await page.locator('#toolsExportBackup').click();
 const downloaded=await dlBackup,backupStream=await downloaded.createReadStream();
 const backupChunks=[];for await(const item of backupStream)backupChunks.push(item);
 const backupText=Buffer.concat(backupChunks).toString('utf8'),actualBackup=JSON.parse(backupText);
 if(actualBackup.format!=='shortform-studio-verified-backup'||!actualBackup.integrity?.value)throw Error('Verified project backup missing manifest');
 const corrupted=structuredClone(actualBackup);corrupted.project.name='tampered name';
 await page.locator('#toolsImportBackup').setInputFiles({name:'corrupted-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupted))});
 await page.waitForFunction(()=>document.querySelector('#toastArea')?.textContent?.includes('Verified restore refused'),null,{timeout:10000});
 const unchanged=await page.evaluate(async()=>{const p=await (await import('./src/storage.js')).loadProject();return p?.id});
 if(unchanged!==originalId)throw Error('Corrupt imported backup replaced saved project state');
 console.log('PASS: real sampled original media identity, saved/duplicate project library, SHA-256 portable backup and fail-closed corrupt restore');
 console.log('PASS: local SRT humor candidates, raw TXT, source modal, chosen compilation, crop, fullscreen and persistence '+JSON.stringify(stored));
 // Precision editor regression: HH:MM:SS:FF, role, a true source insertion,
 // ripple closure and a download of the original-source cut references.
 await page.locator('button[data-tab="editor"]').click();
 await page.locator('#precisionEditor > summary').click();
 await page.waitForFunction(()=>document.querySelector('#precisionEditor')?.open&&document.querySelector('#precisionTimecode'),null,{timeout:7000});
 await page.locator('#precisionTimecode').fill('00:00:00:00');
 await page.locator('#precisionGo').click();
 await page.locator('#precisionStoryRole').selectOption('reaction');
 await page.locator('#sourceIn').fill('1');
 await page.locator('#sourceOut').fill('2');
 const countBefore=await page.locator('#videoTrack [data-seg]').count();
 await page.locator('#precisionInsert').click();
 await page.waitForFunction(n=>document.querySelectorAll('#videoTrack [data-seg]').length>=n+1,countBefore,{timeout:7000});
 await page.locator('#precisionRippleDelete').click();
 await page.waitForFunction(n=>document.querySelectorAll('#videoTrack [data-seg]').length===n,countBefore,{timeout:7000});
 const cutlistEvent=page.waitForEvent('download',{timeout:10000});
 await page.locator('#precisionExportCutList').click();
 const cutlist=await cutlistEvent;
 if(!cutlist.suggestedFilename().endsWith('source-timecodes.txt'))throw Error('Source timecode cutlist did not download');
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  return project?.segments?.length>=2&&project.segments.some(s=>s.storyRole==='reaction');
 },null,{timeout:12000});
 console.log('PASS: real HH:MM:SS:FF navigation, editorial roles, source insert, ripple-delete, metadata persistence and source timecode cut list');

}finally{await browser?.close();server.kill('SIGTERM')}
