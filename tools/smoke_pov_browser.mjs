/** Browser smoke test for honest multi-POV behavior without a vision API key.
 * Testsrc footage is NOT a real gunfight and must never create fake clips.
 */
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
 for(let i=0;i<35;i++){
  try{await page.goto('http://127.0.0.1:8795/',{waitUntil:'domcontentloaded',timeout:3000});break}
  catch(e){if(i===34)throw e;await new Promise(r=>setTimeout(r,250))}
 }
 await page.evaluate(async ({a,b})=>{
  const {newProject,makeSegment}=await import('./src/model.js');
  const {saveProject}=await import('./src/storage.js');
  const p=newProject();p.name='POV visual truth regression';
  p.assets=[
   {id:'a',name:'pvp-test.webm',type:'video',size:a.size,lastModified:a.date,duration:80,width:480,height:270},
   {id:'b',name:'pov-b-test.webm',type:'video',size:b.size,lastModified:b.date,duration:80,width:480,height:270}
  ];
  p.selectedAsset='a';p.segments=[makeSegment('a',0,80)];
  for(const [t,phrase] of [
   [12,'there are two enemy players behind that stone building now'],
   [30,'we need to rush to that truck before the next squad finds us'],
   [48,'be careful i think somebody is watching us from the tower'],
   [67,'let us regroup and get to the bridge before the final circle']
  ])for(const [i,text] of phrase.split(' ').entries()){
   p.words.push({assetId:'a',text,start:t+i*.24,end:t+(i+1)*.24,speaker:'Team'});
   p.words.push({assetId:'b',text,start:t-4+i*.24,end:t-4+(i+1)*.24,speaker:'Team'});
  }
  p.directorBatches=[{id:'legacy-story',mode:'multi-pov-story',key:'old'}];
  p.candidates=[{
   id:'old-fake-montage',mode:'multi-pov-story',source:'multi-pov-story',
   directorBatchId:'legacy-story',title:'Gunfight story (UNVERIFIED)',
   segments:[makeSegment('a',10,18),makeSegment('b',40,48),makeSegment('a',90,98)],
   pov:{jumpCuts:2,povSwitches:2}
  }];
  await saveProject(p);
 },{a:{size:a.size,date:Math.floor(a.mtimeMs)},b:{size:b.size,date:Math.floor(b.mtimeMs)}});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#fileUpload').setInputFiles([A,B]);
 await page.locator('[data-tab="director"]').click();
 if((await page.locator('#directorOutputMode').inputValue())!=='stories')
  throw Error('Two source POV mode not selected');
 if((await page.locator('#candidateList').innerText()).includes('Gunfight story (UNVERIFIED)'))
  throw Error('Outdated no-vision story was still displayed');
 await page.locator('#syncPovTranscripts').click();
 await page.waitForTimeout(200);
 const saved=await page.evaluate(async()=>await (await import('./src/storage.js')).loadProject());
 if(!saved.povSync||saved.povSync.referenceId!=='a'||saved.povSync.targetId!=='b')
  throw Error('Transcripts failed to align original videos');
 // There is no opt-in Remote vision connection. The site must reject requests,
 // not manufacture a synthetic gunfight from transcript text + moving scenery.
 await page.locator('#generateMultiPovHighlights').click();
 await page.waitForTimeout(200);
 const status=await page.locator('#toastArea').innerText();
 if(!status.includes('Remote language-model Director'))
  throw Error('No-key synthetic montage request was not explicitly rejected: '+status);
 const after=await page.evaluate(async()=>await (await import('./src/storage.js')).loadProject());
 if(after.candidates.some(x=>x.pov?.visionVerified))
  throw Error('A fake vision-verified synthetic combat clip was created');
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('PASS: sync works, old montage hidden, no fake action without real vision API');
}finally{
 await browser?.close();server.kill();
}
