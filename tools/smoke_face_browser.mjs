/** End-to-end browser smoke: MediaPipe loads, plus full landscape/portrait video scans. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn('python3',['-m','http.server','8787','--directory','_site'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 for(let i=0;i<30;i++){
  try{await page.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded',timeout:2500});break}
  catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,300))}
 }
 const result=await page.evaluate(async()=>{
  const messages=[];
  const {getFaceDetector,scanFaces}=await import('./src/faces.js');
  const detector=await getFaceDetector(m=>messages.push(m));
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,128,128);
  const detections=await detector.detect(canvas);
  const videos=[];
  for(const name of ['face-test-landscape.webm','face-test-portrait.webm']){
   const response=await fetch('./'+name);if(!response.ok)throw Error('Test media missing '+name);
   const videoFile=new File([await response.blob()],name,{type:'video/webm'});
   const frames=await scanFaces(videoFile,{step:.7,maxSamples:8,onProgress:(pct,status)=>messages.push(status)});
   if(frames.length<2||frames.some(f=>!Number.isFinite(f.x)||!Number.isFinite(f.y)||f.x<0||f.x>1||f.y<0||f.y>1||f.skipped))
    throw Error('Invalid scanned frames for '+name+': '+JSON.stringify(frames));
   videos.push({name,frames:frames.length});
  }
  return {messages,valid:Array.isArray(detections.detections),videos};
 });
 if(!result.valid||!result.messages.includes('Face detector ready (bundled)')||result.videos.length!==2)
  throw Error('Face analysis failed: '+JSON.stringify(result)+' '+issues.join('; '));
 if(issues.length)throw Error('Browser JavaScript error: '+issues.join('; '));
 console.log('PASS: Local MediaPipe bundle and complete landscape/portrait video scans in Chromium '+JSON.stringify(result.videos));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
