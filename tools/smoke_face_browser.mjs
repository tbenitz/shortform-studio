/** Real browser smoke test: load local MediaPipe module, WASM and model; run detect(). */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn('python3',['-m','http.server','8787','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 for(let i=0;i<30;i++){
  try{await page.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded',timeout:2500});break}
  catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,300))}
 }
 const result=await page.evaluate(async()=>{
  const messages=[];
  const {getFaceDetector}=await import('./src/faces.js');
  const detector=await getFaceDetector(m=>messages.push(m));
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,128,128);
  const detections=await detector.detect(canvas);
  return {messages,valid:Array.isArray(detections.detections)};
 });
 if(!result.valid||!result.messages.includes('Face detector ready (bundled)'))throw Error('Face analysis did not initialize from locally packaged assets: '+JSON.stringify(result)+' '+issues.join('; '));
 console.log('PASS: local face JS, WASM and model initialized and detected in Chromium.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
