import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
const A='_site/pvp-test.webm',B='_site/pov-b-test.webm';
const [a,b]=await Promise.all([stat(A),stat(B)]);
const server=spawn('python3',['-m','http.server','8795','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(let n=0;n<35;n++){try{await page.goto('http://127.0.0.1:8795/',{waitUntil:'domcontentloaded',timeout:3000});break}catch(e){if(n===34)throw e;await new Promise(r=>setTimeout(r,250))}}
 await page.evaluate(async ({a,b})=>{
  const {newProject,makeSegment}=await import('./src/model.js'),{saveProject}=await import('./src/storage.js');
  const p=newProject();p.name='Two POV sync E2E';p.settings.clipMin=17;p.settings.clipMax=65;
  p.assets=[{id:'a',name:'pvp-test.webm',type:'video',size:a.size,lastModified:a.date,duration:80,width:480,height:270},
   {id:'b',name:'pov-b-test.webm',type:'video',size:b.size,lastModified:b.date,duration:80,width:480,height:270}];
  p.selectedAsset='a';p.segments=[makeSegment('a',0,80)];
  const phrases=[
   [12,'there are two enemy players behind that stone building now'],
   [30,'we need to rush to that truck before the next squad finds us'],
   [48,'be careful i think somebody is watching us from the tower'],
   [67,'let us regroup and get to the bridge before the final circle']
  ];
  for(const [time,phrase] of phrases)for(const [i,text] of phrase.split(' ').entries()){
   p.words.push({assetId:'a',text,start:time+i*.24,end:time+(i+1)*.24,speaker:'Team'});
   p.words.push({assetId:'b',text,start:time-4+i*.24,end:time-4+(i+1)*.24,speaker:'Team'});
  }
  p.words.push({assetId:'a',text:'enemy spotted shooting',start:25,end:26,speaker:'A'});
  p.words.push({assetId:'b',text:'got him he is down',start:37,end:38,speaker:'B'});
  p.gameplayTracks={
   a:{status:'complete',audio:[{}],fingerprint:a.size+':'+a.date+':1',
    events:[{start:24,end:32,peakTime:28,score:.95},{start:40,end:47,peakTime:43,score:.18}],motion:[{time:27,motion:.9}]},
   b:{status:'complete',audio:[{}],fingerprint:b.size+':'+b.date+':1',
    events:[{start:20,end:25,peakTime:22,score:.12},{start:32,end:45,peakTime:39,score:.98}],motion:[{time:39,motion:.95}]}
  };
  await saveProject(p);
 },{a:{size:a.size,date:Math.floor(a.mtimeMs)},b:{size:b.size,date:Math.floor(b.mtimeMs)}});
 await page.reload({waitUntil:'domcontentloaded'});
 page.on('dialog',d=>d.accept());
 await page.locator('#fileUpload').setInputFiles([A,B]);
 await page.locator('[data-tab="director"]').click();
 await page.locator('#povReference').selectOption('a');
 await page.locator('#povTarget').selectOption('b');
 await page.locator('#syncPovTranscripts').click();
 await page.waitForFunction(()=>document.querySelector('#povSyncStatus')?.textContent?.includes('Matched'),null,{timeout:15000});
 await page.waitForTimeout(1100);
 const sync=await page.evaluate(async()=> (await (await import('./src/storage.js')).loadProject()).povSync);
 if(!sync||sync.referenceId!=='a'||sync.targetId!=='b'||Math.abs(sync.offset+4)>.6)throw Error('Speech clock sync failed: '+JSON.stringify(sync));
 await page.locator('#generateMultiPovHighlights').click();
 await page.waitForFunction(()=>/Generated \d+ synchronized|No new shared-match highlights|Multi-POV Director:/.test(document.querySelector('#directorStatus')?.textContent||''),null,{timeout:50000});
 await page.waitForTimeout(1200);
 const result=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p.candidates.map(c=>({id:c.id,source:c.source,segments:c.segments.map(s=>({assetId:s.assetId,start:s.start,end:s.end,speed:s.speed}))}));
 });
 const combined=result.find(c=>new Set(c.segments.map(s=>s.assetId)).size===2);
 if(!combined)throw Error('No short switches between both POVs: '+JSON.stringify(result));
 await page.locator('[data-candidate-use="'+combined.id+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#engineVideo')?.videoWidth>0&&document.querySelector('#engineVideo')?.readyState>=2,null,{timeout:20000});
 await page.waitForTimeout(1300);
 const saved=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return {sync:p.povSync,assets:[...new Set(p.segments.map(s=>s.assetId))]};
 });
 if(!saved.sync||saved.assets.length!==2)throw Error('Multi-source edit not saved: '+JSON.stringify(saved));
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('PASS: Two separate imported POV videos synchronized at '+sync.offset+' seconds, combined short with '+combined.segments.length+' switched cuts, decoded browser preview, saved project.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
