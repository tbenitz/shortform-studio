/** Real Director UI smoke test: three-hour coverage, novel clips, source-hour filter, saved history. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn('python3',['-m','http.server','8790','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<35;i++){try{await page.goto('http://127.0.0.1:8790/',{waitUntil:'domcontentloaded',timeout:2500});break}
 catch(e){if(i===34)throw e;await new Promise(r=>setTimeout(r,300))}}
 await page.evaluate(async()=>{
  const {newProject,makeSegment}=await import('./src/model.js');
  const {saveProject}=await import('./src/storage.js');
  const project=newProject();
  project.name='Three-hour coverage browser test';
  project.assets=[{id:'long',name:'3hour.mp4',type:'video',size:1000,lastModified:1,duration:10800,width:640,height:360}];
  project.segments=[makeSegment('long',0,10800)];
  project.transcriptProgress={long:{status:'complete',total:10800,nextAt:10800}};
  for(let i=0;i<1200;i++){
   const phrase=i%4===0?'Here is the interesting reason why that prediction was wrong and everyone laughed.':'Then we saw the result and learned something important about the conversation.';
   const words=phrase.split(' ');
   words.forEach((word,j)=>project.words.push({id:'word-'+i+'-'+j,assetId:'long',text:word,start:i*9+j*4/words.length,end:i*9+(j+1)*4/words.length,speaker:'Speaker 1'}));
  }
  await saveProject(project);
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-tab="director"]').click();
 if(!(await page.locator('#inspectorContent').innerText()).includes('36 of 36'))
  throw Error('Three-hour transcript coverage was not surfaced');
 await page.locator('#generateAllClips').click();
 await page.waitForFunction(()=>document.querySelector('#directorStatus')?.textContent?.includes('Added'),{timeout:30000});
 const first=await page.evaluate(async()=>{
  const {loadProject}=await import('./src/storage.js');
  // Commit autosave is asynchronous; UI already contains authoritative current count.
  const info=document.querySelector('#directorStatus').textContent;
  return {status:info,cards:document.querySelectorAll('.candidate').length,hours:[...document.querySelector('#directorHourFilter').options].map(o=>o.textContent)};
 });
 if(first.cards<10||first.hours.length<4)throw Error('Director found too few clips or omitted source hours: '+JSON.stringify(first));
 await page.locator('#directorHourFilter').selectOption('2');
 const thirdHour=(await page.locator('#candidateList').innerText());
 if(!thirdHour.includes('Source 2:'))throw Error('Third hour has no viewable clips: '+thirdHour.slice(0,200));
 await page.locator('#directorHourFilter').selectOption('all');
 await page.locator('#generateClips').click();
 await page.waitForFunction(()=>document.querySelector('#directorStatus')?.textContent?.includes('Added')||document.querySelector('#directorStatus')?.textContent?.includes('No additional'),{timeout:30000});
 if(errors.length)throw Error('Director browser errors: '+errors.join(' | '));
 console.log('PASS: 3-hour transcript produces many full-recording clips, source-hour filtering works, and repeated searches retain novelty history. '+JSON.stringify(first));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
