/** Browser E2E: real decoded PvP audio/video scan, source-evidence clip selection and preview. */
import {chromium} from 'playwright';
import {stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const path='_site/pvp-test.webm',size=(await stat(path)).size;
const server=spawn('python3',['-m','http.server','8793','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<35;i++){try{await page.goto('http://127.0.0.1:8793/',{waitUntil:'domcontentloaded',timeout:3500});break}catch(e){if(i===34)throw e;await new Promise(r=>setTimeout(r,300))}}
 await page.evaluate(async fileSize=>{
  const {newProject,makeSegment}=await import('./src/model.js');
  const {saveProject}=await import('./src/storage.js');
  const project=newProject();project.name='CoD gameplay event E2E';
  project.assets=[{id:'cod-source',name:'pvp-test.webm',size:fileSize,type:'video',mime:'video/webm',duration:80,width:480,height:270,lastModified:1}];
  project.selectedAsset='cod-source';project.segments=[makeSegment('cod-source',0,80)];
  const phrases=[
   [7,'enemy proximity chat talking to us I baited him and trolled him haha'],
   [17,'I got him down and eliminated that player'],
   [23,'bro you are so bad haha get wrecked'],
   [49,'on me another squad behind the building'],
   [56,'they are shooting I am down revive me'],
   [63,'what a funny rescue bro you are trash']
  ];
  for(const [start,sentence] of phrases){
   const pieces=sentence.split(' ');
   pieces.forEach((text,i)=>project.words.push({id:start+'-'+i,assetId:'cod-source',start:start+i*.32,end:start+(i+1)*.32,text,speaker:'Speaker 1'}));
  }
  project.settings.provider='heuristic';project.settings.mode='cod-pvp';
  project.settings.clipMin=15;project.settings.clipMax=45;project.settings.gameplayMinScore=35;
  project.settings.directorInstructions='Include full gunfights, downed and reviving teammates, and funny trash talk. No dialogue-only clips.';
  await saveProject(project);
 },size);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#fileUpload').setInputFiles(path);
 await page.locator('[data-tab="director"]').click();
 await page.locator('#scanGameplayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#gameplayStatus')?.textContent?.includes('Gameplay analysis saved'),null,{timeout:120000});
 const scan=await page.evaluate(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  const track=project.gameplayTracks?.['cod-source'];
  return {status:track?.status,audio:track?.audio?.length,events:track?.events?.length,motion:track?.motion?.length,warnings:track?.warnings||[]};
 });
 if(scan.status!=='complete'||scan.audio<78||scan.motion<1||scan.events<1)
  throw Error('Actual gameplay scan incomplete or missing sensor evidence: '+JSON.stringify(scan));
 await page.locator('#generatePvPClips').click();
 await page.waitForFunction(()=>document.querySelector('#directorStatus')?.textContent?.includes('Found')||document.querySelector('#directorStatus')?.textContent?.includes('No transcript-confirmed'),null,{timeout:30000});
 await page.waitForTimeout(1400);
 const result=await page.evaluate(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  return {clips:project.candidates.length,items:project.candidates.map(c=>({start:c.segments[0]?.start,end:c.segments[0]?.end,source:c.source,segments:c.segments.length,reason:c.reason,score:c.score}))};
 });
 if(!result.clips||!result.items.every(c=>c.source==='pvp-evidence'&&c.segments===1))throw Error('Generated disconnected transcript-only snippets instead of real action clips: '+JSON.stringify(result));
 const debug=await page.evaluate(async()=>{
  const project=await (await import('./src/storage.js')).loadProject();
  const {extractGameplaySignals,generatePvPHighlights}=await import('./src/gameplay-director.js');
  const {parseEditorialDirection}=await import('./src/director-intent.js');
  const signals=extractGameplaySignals(project.words,project.gameplayTracks);
  const raw=generatePvPHighlights(project.words,project.assets,project.gameplayTracks,{...project.settings,clipCount:0,existingCandidates:[],history:[]});
  return {instructions:project.settings.directorInstructions,profile:parseEditorialDirection(project.settings.directorInstructions),
   firstSignals:signals.filter(x=>x.start<40).map(x=>({start:x.start,end:x.end,kind:x.kind,tags:x.tags,score:x.score})),
   raw:raw.map(c=>({start:c.segments[0].start,end:c.segments[0].end,score:c.score,tags:c.gameplay?.tags,matches:c.gameplay?.directionMatch?.matches})),
   scans:project.gameplayTracks?.['cod-source']?.events?.map(x=>x.start)};
 });
 console.log('PvP discovery diagnostic: '+JSON.stringify(debug));
 if(!result.items.some(c=>c.start<=10&&c.end>=18))throw Error('First action sequence was cut away: '+JSON.stringify({items:result.items,debug}));
 await page.locator('[data-candidate-play]').first().click();
 await page.waitForFunction(()=>{
  const v=document.querySelector('#engineVideo');
  return v.videoWidth>0&&v.readyState>=2&&!v.seeking;
 },null,{timeout:20000});
 const pixels=await page.evaluate(()=>{
  const c=document.querySelector('#previewCanvas'),ctx=c.getContext('2d'),x=Math.floor(c.width/2),y=Math.floor(c.height/2);
  return [...ctx.getImageData(x,y,1,1).data];
 });
 if(pixels.slice(0,3).every(n=>n<20))throw Error('Actual PvP preview frame is black despite subtitles: '+pixels);
 // Two radically different editorial instructions must produce SEPARATE, distinct clip batches.
 const firstDirection='ONLY enemy proximity chat trolling';
 await page.locator('#directorPrompt').fill(firstDirection);
 await page.locator('#generatePvPClips').click();
 await page.waitForFunction(expected=>{
  const status=document.querySelector('#directorStatus')?.textContent||'';
  return document.querySelector('#directorPrompt')?.value===expected&&/(Found|No transcript-confirmed)/.test(status)
 },firstDirection,{timeout:30000});
 await page.waitForTimeout(1300);
 const troll=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  const id=p.directorActiveBatchId;
  return {id,prompt:p.directorBatches.find(b=>b.id===id)?.direction,
   starts:p.candidates.filter(c=>c.directorBatchId===id).map(c=>c.segments[0].start),all:p.candidates.length};
 });
 if(troll.prompt!==firstDirection||!troll.starts.length||!troll.starts.every(t=>t<35))
  throw Error('Enemy trolling request was ignored or includes unrelated revive clips: '+JSON.stringify(troll));
 const secondDirection='ONLY revives and rescues';
 await page.locator('#directorPrompt').fill(secondDirection);
 await page.locator('#generatePvPClips').click();
 await page.waitForFunction(expected=>{
  const status=document.querySelector('#directorStatus')?.textContent||'';
  return document.querySelector('#directorPrompt')?.value===expected&&/(Found|No transcript-confirmed)/.test(status)
 },secondDirection,{timeout:30000});
 await page.waitForTimeout(1300);
 const revive=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  const id=p.directorActiveBatchId;
  return {id,prompt:p.directorBatches.find(b=>b.id===id)?.direction,
   starts:p.candidates.filter(c=>c.directorBatchId===id).map(c=>c.segments[0].start),all:p.candidates.length};
 });
 if(revive.prompt!==secondDirection||!revive.starts.length||!revive.starts.every(t=>t>35)||revive.id===troll.id||revive.all<=troll.all)
  throw Error('Revive direction recycled opponent troll clips instead of finding a distinct later fight: '+JSON.stringify({troll,revive}));
 await page.locator('#directorResultsView').selectOption(troll.id);
 const earlierView=await page.locator('#candidateList').innerText();
 if(!earlierView.includes('enemy-chat trolling')&&!earlierView.includes('Trolling'))
  throw Error('Saved trolling search not visible when selected from comparison menu: '+earlierView.slice(0,260));
 await page.locator('#directorResultsView').selectOption('active');
 if(errors.length)throw Error('Page errors: '+errors.join(' | '));
 console.log('PASS: Totally different creative directions generated different saved shorts, old search remains selectable. '+JSON.stringify({troll,revive}));
 console.log('PASS: Real PvP audio/video scanned '+JSON.stringify(scan)+', generated '+result.clips+' continuous action clips, preview displayed decoded nonblack gameplay.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
