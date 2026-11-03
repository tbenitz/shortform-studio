/** Browser regression: saved subtitles with missing large source, relink, and distant video seeks. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
const filename='_site/playback-test.webm';
const fileSize=(await stat(filename)).size;
const server=spawn('python3',['-m','http.server','8791','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 // Explicitly accept the warning when a different/converted recording is relinked.
 page.on('dialog',dialog=>dialog.accept());
 for(let i=0;i<35;i++){
  try{await page.goto('http://127.0.0.1:8791/',{waitUntil:'domcontentloaded',timeout:3000});break}
  catch(error){if(i===34)throw error;await new Promise(r=>setTimeout(r,250))}
 }
 await page.evaluate(async size=>{
  const {newProject,makeSegment}=await import('./src/model.js');
  const {saveProject}=await import('./src/storage.js');
  const project=newProject();
  project.name='Preview relink regression';
  project.assets=[{id:'long',name:'playback-test.webm',size,type:'video',mime:'video/webm',duration:24,width:640,height:360,lastModified:1}];
  project.selectedAsset='long';
  project.segments=[makeSegment('long',14,18),makeSegment('long',2,7)];
  project.words=[
   {id:'a',assetId:'long',start:14.2,end:14.9,text:'first',speaker:'Speaker 1'},
   {id:'b',assetId:'long',start:2.2,end:2.9,text:'second',speaker:'Speaker 1'}
  ];
  await saveProject(project);
 },fileSize);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#previewMediaStatus:not([hidden])',{timeout:15000});
 const missing=await page.locator('#previewMediaMessage').innerText();
 if(!missing.includes('Original video not linked')||!(await page.locator('#relinkFromPreview').isVisible()))
  throw Error('Missing source should show explicit relink overlay, not black canvas: '+missing);
 const track=await page.locator('#captionTrack').innerText();
 if(!track.includes('2 timed words'))throw Error('Subtitle metadata not preserved while video unlinked');
 console.log('PASS: Unlinked original shows actionable relink while subtitle metadata is retained.');
 const chooserEvent=page.waitForEvent('filechooser');
 await page.locator('#relinkFromPreview').click();
 const chooser=await chooserEvent;await chooser.setFiles(filename);
 const frameReady=()=>page.waitForFunction(()=>{
  const v=document.getElementById('engineVideo'),overlay=document.getElementById('previewMediaStatus');
  return overlay.hidden&&v.readyState>=2&&!v.seeking&&v.videoWidth>0&&Math.abs(v.currentTime-14)<.3;
 },null,{timeout:25000});
 await frameReady();
 const verifyCanvas=async label=>{
  const pixels=await page.evaluate(()=>{
   const c=document.getElementById('previewCanvas'),ctx=c.getContext('2d');
   return [[.3,.3],[.5,.5],[.7,.65]].map(([x,y])=>[...ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data].slice(0,3));
  });
  if(!pixels.some(p=>p.reduce((sum,v)=>sum+v,0)>130))
   throw Error(label+' decoded video frame is black: '+JSON.stringify(pixels));
 };
 await verifyCanvas('First cut at 14 seconds');
 // Test a calibrated subtitle offset, saved separately from the original source transcript.
 await page.locator('[data-tab="transcript"]').click();
 await page.locator('#subtitleOffsetInput').fill('0.5');
 await page.locator('#subtitleOffsetInput').dispatchEvent('change');
 await page.waitForTimeout(1700); // let IndexedDB autosave complete
 const calibrated=await page.evaluate(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  const mapped=(await import('./src/model.js')).mapWords(project);
  return {offset:project.subtitleOffsets.long,words:project.words.map(w=>[w.text,w.start,w.end]),mapped:mapped.map(w=>[w.text,w.projectStart,w.projectEnd])};
 });
 if(calibrated.offset!==.5||calibrated.mapped.length!==2||
    Math.abs(calibrated.mapped[0][1]-.7)>.02||Math.abs(calibrated.mapped[1][1]-4.7)>.02)
  throw Error('Per-source subtitle alignment does not follow timeline after relink: '+JSON.stringify(calibrated));
 // Re-import an SRT exported from an EDITED timeline; preserve source-time words.
 await page.locator('#srtTimeBasis').selectOption('edited');
 await page.locator('#srtUpload').setInputFiles({
  name:'edited-project.srt',mimeType:'text/plain',
  buffer:Buffer.from('1\n00:00:00,700 --> 00:00:01,400\nfirst\n\n2\n00:00:04,700 --> 00:00:05,400\nsecond\n')
 });
 await page.waitForTimeout(1600);
 const remapped=await page.evaluate(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  return {offset:project.subtitleOffsets.long,words:project.words.map(w=>[w.text,w.start,w.end]),mapped:(await import('./src/model.js')).mapWords(project).map(w=>[w.text,w.projectStart])};
 });
 if(remapped.offset!==.5||remapped.words.length!==2||
   Math.abs(remapped.words.find(w=>w[0]==='first')?.[1]-14.2)>.02||
   Math.abs(remapped.words.find(w=>w[0]==='second')?.[1]-2.2)>.02)
  throw Error('Edited SRT import incorrectly changed source caption times: '+JSON.stringify(remapped));
 console.log('PASS: Subtitle shift and edited SRT import match original source frames and survive local save.');

 const initialSrc=await page.locator('#engineVideo').evaluate(v=>v.src);
 await page.locator('#playButton').click();
 await page.waitForFunction(()=>{
  const video=document.getElementById('engineVideo');
  return !video.paused&&video.currentTime>14.7&&Number(document.getElementById('playhead').value)>.6;
 },null,{timeout:16000});
 await page.locator('#playButton').click();
 await page.locator('#playhead').evaluate(range=>{
  range.value='4.25';range.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.waitForFunction(()=>{
  const v=document.getElementById('engineVideo');
  return v.readyState>=2&&!v.seeking&&v.videoWidth>0&&Math.abs(v.currentTime-2.25)<.35;
 },null,{timeout:25000});
 await verifyCanvas('Second cut at 2 seconds');
 // Relink the same asset ID again: the underlying blob URL must be replaced.
 await page.locator('#fileUpload').setInputFiles(filename);
 await page.waitForFunction(previous=>{
  const v=document.getElementById('engineVideo');
  return v.src!==previous&&v.readyState>=2&&!v.seeking&&v.videoWidth>0;
 },initialSrc,{timeout:25000});
 await verifyCanvas('Relinked replacement source URL');
 const secondSrc=await page.locator('#engineVideo').evaluate(v=>v.src);
 await page.locator('#relinkSourceUpload').setInputFiles('_site/renamed-playback-test.webm');
 await page.waitForFunction(previous=>{
  const video=document.getElementById('engineVideo');
  return video.src!==previous && video.videoWidth>0 && !video.seeking && video.readyState>=2;
 },secondSrc,{timeout:25000});
 await verifyCanvas('Re-encoded and renamed replacement video');
 const name=await page.locator('#assetsList').innerText();
 if(!name.includes('renamed-playback-test.webm'))throw Error('Converted source was not attached to existing asset');
 // Refresh after re-link: source SRT and subtitle shift persist without re-transcription.
 await page.reload({waitUntil:'domcontentloaded'});
 const restored=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return {offset:p.subtitleOffsets?.long,words:p.words.map(w=>[w.text,w.start]),assets:p.assets.map(a=>a.id)};
 });
 if(restored.offset!==.5||restored.words.length!==2||!restored.assets.includes('long'))
  throw Error('Subtitle synchronization lost on refresh: '+JSON.stringify(restored));
 if(errors.length)throw Error('Page JavaScript errors: '+errors.join(' | '));
 console.log('PASS: Real video loads, seeks/plays distant cuts, renders nonblack pixels, and retains timelines after same-file AND converted/renamed-file relinking.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
