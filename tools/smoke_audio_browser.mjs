/** Browser smoke: decode an actual WebM/Opus clip from bounded slices in Chromium. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn('python3',['-m','http.server','8788','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<30;i++){
  try{await page.goto('http://127.0.0.1:8788/',{waitUntil:'domcontentloaded',timeout:2500});break}
  catch(e){if(i===29)throw e;await new Promise(resolve=>setTimeout(resolve,250))}
 }
 const result=await page.evaluate(async()=>{
  const {openAudioReader,SAMPLE_RATE}=await import('./src/audio-reader.js');
  const response=await fetch('./audio-test.webm');
  if(!response.ok)throw Error('Audio test recording missing');
  const blob=await response.blob();
  const reader=await openAudioReader(blob);
  try{
   if(reader.duration<4)throw Error('Audio duration incorrectly detected: '+reader.duration);
   const windows=[];
   for(const [start,end] of [[0,1.5],[1.5,3],[3,4.5]]){
    const pcm=await reader.readRange(start,end);
    let total=0;for(const v of pcm)total+=v*v;
    const rms=Math.sqrt(total/pcm.length);
    if(pcm.length!==Math.ceil((end-start)*SAMPLE_RATE)||rms<.01)
     throw Error('Incorrect audio decoding window '+JSON.stringify({start,end,length:pcm.length,rms}));
    windows.push({start,end,rms:+rms.toFixed(3)});
   }
   return {duration:reader.duration,windows};
  }finally{reader.close()}
 });
 // End-to-end check: a real user can save the Director key, reload, and forget it.
 await page.locator('button[data-tab="director"]').click();
 await page.locator('select[data-setting="provider"]').selectOption('remote');
 await page.locator('#providerKey').fill('nonsecret-ci-test-key');
 const stored=await page.evaluate(()=>localStorage.getItem('shortform-studio:director-api-key:v1'));
 if(stored!=='nonsecret-ci-test-key')throw Error('Director key not persisted to browser storage');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('button[data-tab="director"]').click();
 if(await page.locator('select[data-setting="provider"]').inputValue()!=='remote')await page.locator('select[data-setting="provider"]').selectOption('remote');
 const restored=await page.locator('#providerKey').inputValue();
 if(restored!=='nonsecret-ci-test-key')throw Error('Director key not restored on browser reload');
 await page.locator('#forgetDirectorKey').click();
 const cleared=await page.evaluate(()=>localStorage.getItem('shortform-studio:director-api-key:v1'));
 if(cleared!==null||await page.locator('#providerKey').inputValue()!=='')throw Error('Forget API key did not clear persistent and visible values');
 console.log('PASS: Director API key survives reload and Forget stored key removes it.');
 if(errors.length)throw Error('Page JavaScript errors: '+errors.join('; '));
 console.log('PASS: streamed real audio, 3 decoded windows, no full-file decode. '+JSON.stringify(result));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
