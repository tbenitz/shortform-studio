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
  // Regression: user has HUNDREDS of saved one-cut `cod-pvp` proposals, but
  // has never saved POV alignment. Default Generate must not recycle the raw list.
  p.directorBatches=[{id:'legacy-raw',key:'old raw fight scan',mode:'cod-pvp',direction:'fight real players'}];
  p.directorActiveBatchId='legacy-raw';
  p.candidates=Array.from({length:500},(_,i)=>({
   id:'raw-moment-'+i,mode:'cod-pvp',source:'gameplay-heuristic',
   directorBatchId:'legacy-raw',title:'Old one-cut moment '+i,
   segments:[makeSegment(i%2?'b':'a',i%2?1:2,i%2?5:6)],duration:4,score:50
  }));
  await saveProject(p);
 },{a:{size:a.size,date:Math.floor(a.mtimeMs)},b:{size:b.size,date:Math.floor(b.mtimeMs)}});
 await page.reload({waitUntil:'domcontentloaded'});
 page.on('dialog',d=>d.accept());
 await page.locator('#fileUpload').setInputFiles([A,B]);
 await page.locator('[data-tab="director"]').click();
 const mode=await page.locator('#directorOutputMode').inputValue();
 if(mode!=='stories')throw Error('Two loaded VODs defaulted to RAW one-cut discovery instead of edited A+B stories: '+mode);
 const firstView=await page.locator('#candidateList').innerText();
 if(firstView.includes('Old one-cut moment'))throw Error('500 old raw proposals are incorrectly shown in the active multi-POV story view');
 if(!await page.locator('#directorModeNotice').innerText().then(s=>s.includes('500 earlier raw one-cut results')))
  throw Error('Old raw one-cut search is not separately explained to the user.');
 const initial=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return {sync:p.povSync,count:p.candidates.length};
 });
 if(initial.sync!==null||initial.count!==500)throw Error('Fixture should have 500 raw clips and no sync: '+JSON.stringify(initial));
 // Regression: user pastes a LONG filmmaking brief and previously gets ZERO.
 // This must be treated as editing goals, not dozens of contradictory hard filters.
 const pastedBrief=[
 '# AI DIRECTOR — MULTI-POV CALL OF DUTY STORY EDITOR',
 'Create at least FIVE genuinely entertaining edited stories. Do not group random moments together.',
 'PRIMARY OBJECTIVE: gunfights, player sightings, death, revives, funny trash talk, full action.',
 'STORY FIRST — CUT SECOND: setup, action, turning point and payoff. Preserve gunplay without arbitrary 7-second cuts.',
 'STRICT QUALITY CONTROL: reject random banter, no dialogue-only clips, never fabricate kills or identity.',
 '1. Player pursuit: POV A 00:00:16–00:01:12; POV B 00:00:12–00:01:08.',
 'Look for separate angle at the same encounter. Do not confuse stream intros with enemy combat.',
 'Return a screenplay with original in-out times and a review, do not label fake single clips as stories.'
 ].join('\n');
 await page.locator('#directorPrompt').fill(pastedBrief);
 if(!await page.locator('#directionEvidenceHint').count())throw Error('Creative direction editor not available');
 // Click the SAME generic generation button the user clicked, without touching manual POV sync.
 await page.locator('#generateAllClips').click();
 await page.waitForFunction(()=>/Drafted \d+ of \d+ requested multi-POV stories|No NEW two-POV montage stories|Multi-POV Director:/.test(document.querySelector('#directorStatus')?.textContent||''),null,{timeout:50000});
 await page.waitForTimeout(1200);
 const sync=await page.evaluate(async()=> (await (await import('./src/storage.js')).loadProject()).povSync);
 if(!sync||sync.referenceId!=='a'||sync.targetId!=='b'||Math.abs(sync.offset+4)>.6)
  throw Error('One-click GENERATE failed to synchronize both original recordings: '+JSON.stringify(sync));
 const modeAfter=await page.locator('#directorOutputMode').inputValue();
 if(modeAfter!=='stories')throw Error('Director fell back to raw clips after automatic sync');
 await page.waitForFunction(()=>/Drafted \d+ of \d+ requested multi-POV stories|No NEW two-POV montage stories|Multi-POV Director:/.test(document.querySelector('#directorStatus')?.textContent||''),null,{timeout:50000});
 await page.waitForTimeout(1200);
 const result=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return p.candidates.map(c=>({id:c.id,source:c.source,mode:c.mode,pov:c.pov,segments:c.segments.map(s=>({assetId:s.assetId,start:s.start,end:s.end,speed:s.speed,storyRole:s.storyRole,globalStart:s.storyGlobalStart,globalEnd:s.storyGlobalEnd}))}));
 });
 const rawCount=result.filter(c=>c.mode==='cod-pvp').length;
 if(rawCount!==500)throw Error('The old 500 raw one-cuts were overwritten: '+rawCount);
 const storyOnlyView=await page.locator('#candidateList').innerText();
 if(storyOnlyView.includes('Old one-cut moment'))throw Error('Generated multi-POV results remain mixed with old one-cuts');
 const combined=result.find(c=>c.mode==='multi-pov-story'&&new Set(c.segments.map(s=>s.assetId)).size===2);
 if(!combined)throw Error('No actual edited story uses both source POVs: '+JSON.stringify(result));
 if(result.filter(c=>c.mode==='multi-pov-story').length>=5)throw Error('One synthetic 80s encounter should not fabricate five independent stories');
 if(combined.segments.length<4||combined.pov.cutCount!==combined.segments.length||combined.pov.jumpCuts<1)
  throw Error('Proposed story is one continuous source instead of multiple parts stitched together: '+JSON.stringify(combined));
 if(!combined.segments[0].storyRole.includes('Hook')||!combined.segments.at(-1).storyRole.match(/Payoff|Reaction|aftermath/i))
  throw Error('Missing setup and payoff story beats: '+JSON.stringify(combined));
 // An actual edited montage must omit time between source moments.
 const jumps=combined.segments.slice(1).map((s,i)=>s.globalStart-combined.segments[i].globalEnd);
 if(!jumps.some(g=>g>1.2))throw Error('No jump cut among multiple story pieces: '+JSON.stringify(jumps));
 const storyboard=await page.locator('.candidate').filter({has:page.locator('[data-candidate-use="'+combined.id+'"]')}).innerText();
 if(!storyboard.includes('Story storyboard')||!storyboard.includes('POV A')||!storyboard.includes('POV B'))
  throw Error('Result card hides cuts/POV files and looks like a single source URL: '+storyboard.slice(0,850));
 await page.locator('[data-candidate-use="'+combined.id+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#engineVideo')?.videoWidth>0&&document.querySelector('#engineVideo')?.readyState>=2,null,{timeout:20000});
 const initialVideoSource=await page.locator('#engineVideo').evaluate(v=>v.currentSrc);
 await page.waitForTimeout(1300);
 const saved=await page.evaluate(async()=>{
  const p=await (await import('./src/storage.js')).loadProject();
  return {sync:p.povSync,assets:[...new Set(p.segments.map(s=>s.assetId))]};
 });
 if(!saved.sync||saved.assets.length!==2)throw Error('Multi-source edit not saved: '+JSON.stringify(saved));
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 // The two video files have deliberately different VIDEO CONTENT; prove the
 // actual HTML media element changes sources when jumping between story beats.
 const firstId=combined.segments[0].assetId;
 const targetIndex=combined.segments.findIndex((s,i)=>i>0&&s.assetId!==firstId);
 if(targetIndex<1)throw Error('Storyboard did not actually switch sources.');
 const firstSeconds=combined.segments.slice(0,targetIndex).reduce((sum,s)=>sum+(s.end-s.start)/s.speed,0);
 await page.locator('#playhead').evaluate((range,t)=>{range.value=String(t+.35);range.dispatchEvent(new Event('input',{bubbles:true}))},firstSeconds);
 await page.waitForFunction(prev=>{
  const v=document.getElementById('engineVideo');
  return v?.readyState>=2&&!v.seeking&&v.videoWidth>0&&v.currentSrc!==prev;
 },initialVideoSource,{timeout:20000});
 const selected=await page.evaluate(()=>({src:document.getElementById('engineVideo').currentSrc,currentTime:document.getElementById('engineVideo').currentTime}));
 if(!(selected.src||'').startsWith('blob:')||selected.src===initialVideoSource)
  throw Error('Second POV source WAS NOT loaded for narrative montage cut: '+JSON.stringify(selected));
 console.log('PASS: Default Generate auto-syncs previously unsynced VODs, hides/preserves 500 old raw one-cuts, creates '+combined.segments.length+' real A+B cuts with '+combined.pov.jumpCuts+' jumps, and decodes switched video POV.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
