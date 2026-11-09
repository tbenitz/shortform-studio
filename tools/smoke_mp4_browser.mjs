/** End-to-end browser check: favorites, explicit project restore and actual MP4/H.264/AAC. */
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const testFile='_site/mp4-test.webm';
await stat(testFile);
const server=spawn('python3',['-m','http.server','8797','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<30;i++){
  try{await page.goto('http://127.0.0.1:8797/',{waitUntil:'domcontentloaded',timeout:3000});break}
  catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,200))}
 }
 await page.waitForSelector('#loadLastProject');
 if(!(await page.locator('#loadLastProject').isDisabled()))throw Error('Fresh browser has an unexpected last-project button enabled');
 if(!(await page.locator('#timelineSummary').innerText()).includes('0 clips'))throw Error('A fresh project should have no cuts');
 await page.locator('#fileUpload').setInputFiles(testFile);
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length===1,{timeout:10000}).catch(async()=>{await page.waitForSelector('#videoTrack [data-seg]',{timeout:10000})});
 const srcStar=page.locator('#assetsList [data-source-fav]').first();
 await srcStar.click();
 if(await srcStar.getAttribute('aria-pressed')!=='true')throw Error('Source favorite did not set aria-pressed');
 await page.locator('#favoriteSourcesFilter').click();
 if(await page.locator('#assetsList [data-asset]').count()!==1)throw Error('Favorite source filter did not retain starred source');
 await page.locator('#favoriteSourcesFilter').click();
 await page.locator('#videoTrack [data-seg]').first().click();
 await page.locator('button[data-tab="editor"]').click();
 await page.locator('#toggleSegmentFavorite').click();
 if(!(await page.locator('#toggleSegmentFavorite').innerText()).includes('Favorited'))throw Error('Timeline clip favorite toggle failed');
 await page.locator('#projectName').fill('MP4 and recovery regression');
 await page.locator('#projectName').dispatchEvent('change');
 await page.locator('#saveProject').click();
 await page.waitForFunction(async()=>{
  const {loadProject}=await import('./src/storage.js');
  const p=await loadProject();return p?.name==='MP4 and recovery regression'&&p?.assets?.[0]?.favorite===true&&p?.segments?.[0]?.favorite===true;
 },null,{timeout:12000});
 // Small file bytes must also be cached. No implicit load is allowed on refresh.
 await page.waitForFunction(async()=>{
  const {loadProject,loadMedia}=await import('./src/storage.js');const p=await loadProject();
  return p?.assets?.[0]?.id && !!(await loadMedia(p.assets[0].id));
 },null,{timeout:12000});
 await page.reload({waitUntil:'domcontentloaded'});
 if(!(await page.locator('#timelineSummary').innerText()).includes('0 clips'))throw Error('Refresh must start with a new, blank project');
 await page.waitForFunction(()=>document.querySelector('#loadLastProject')?.disabled===false,null,{timeout:10000});
 await page.locator('#loadLastProject').click();
 await page.waitForFunction(()=>document.querySelectorAll('#videoTrack [data-seg]').length===1,null,{timeout:12000});
 const restored=await page.evaluate(async()=>{
  const store=await import('./src/storage.js');
  const project=await store.loadProject();
  return {name:project.name,sourceFavorite:project.assets[0].favorite,clipFavorite:project.segments[0].favorite};
 });
 if(!restored.sourceFavorite||!restored.clipFavorite)throw Error('Favorites were not preserved after reload: '+JSON.stringify(restored));
 if(!(await page.locator('#assetsList').innerText()).includes('Ready'))throw Error('Cached source was not reconnected automatically');
 console.log('PASS: Fresh startup, explicit load last, source reattachment and two types of persistent favorites');
 // A real-browser video exporter must produce video/mp4 bytes with actual H.264/AAC streams.
 const codecSupport=await page.evaluate(async()=>{
   const variants=[44100,48000].map(rate=>({codec:'mp4a.40.2',sampleRate:rate,numberOfChannels:2,bitrate:160000}));
   return {browser:navigator.userAgent,
    aac:typeof AudioEncoder==='undefined'?[]:await Promise.all(variants.map(async config=>{try{return {rate:config.sampleRate,supported:(await AudioEncoder.isConfigSupported(config)).supported}}catch(e){return {rate:config.sampleRate,error:e.message}}})),
    recorder:typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported('video/mp4;codecs="avc1.42E01E,mp4a.40.2"')};
  });
 console.log('MP4 encoder support: '+JSON.stringify(codecSupport));
 await page.locator('button[data-tab="export"]').click();
 await page.locator('[data-setting="outputHeight"]').fill('240');
 await page.locator('[data-setting="outputHeight"]').dispatchEvent('change');
 await page.locator('[data-setting="fps"]').fill('24');
 await page.locator('[data-setting="fps"]').dispatchEvent('change');
 const downloader=page.waitForEvent('download',{timeout:50000}).then(download=>({download})).catch(e=>({error:e.message}));
 const exportError=page.waitForFunction(()=>document.querySelector('#toastArea')?.textContent?.includes('Export failed')||document.querySelector('#renderStatus')?.textContent?.includes('MP4 export failed'),null,{timeout:50000}).then(async()=>({failure:(await page.locator('#toastArea').innerText())+' | '+(await page.locator('#renderStatus').innerText())})).catch(()=>({}));
 await page.locator('#doExport').click();
 const result=await Promise.race([downloader,exportError]);
 if(result.failure)throw Error('Actual browser MP4 export error: '+result.failure);
 if(!result.download)throw Error('No MP4 download: '+JSON.stringify(result)+' | '+await page.locator('#renderStatus').innerText());
 const download=result.download;
 if(!download.suggestedFilename().endsWith('.mp4'))throw Error('Export did not produce .mp4: '+download.suggestedFilename());
 const output=path.join(tmpdir(),'studio-browser-mp4-smoke.mp4');
 await download.saveAs(output);
 const bytes=await readFile(output);
 if(bytes.toString('ascii',4,8)!=='ftyp')throw Error('Output is not an ISO BMFF/MP4 container');
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type','-show_entries','format=duration','-of','json',output],{encoding:'utf8'}));
 const streams=(probe.streams||[]).map(s=>s.codec_name);
 if(!streams.includes('h264')||!streams.includes('aac'))throw Error('Export must contain real H.264 and AAC, got '+JSON.stringify(probe));
 if(!(Number(probe.format?.duration)>1))throw Error('Invalid MP4 duration: '+JSON.stringify(probe));
 console.log('PASS: Actual MP4 exported and verified via ffprobe '+JSON.stringify({bytes:bytes.length,streams,duration:probe.format.duration}));
 if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
}finally{await browser?.close();server.kill('SIGTERM')}
