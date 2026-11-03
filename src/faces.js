/** Face-aware crops with a bundled on-device MediaPipe engine and CDN fallbacks. */
import {clamp} from './model.js';
const base=new URL('../vendor/mediapipe/',import.meta.url).href;
const version='0.10.35';
const model='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
export function faceRuntimeSources(){
 const sources=[{name:'bundled',moduleUrl:base+'vision_bundle.mjs',wasmUrl:base+'wasm',modelUrl:base+'models/blaze_face_short_range.tflite'}];
 for(const item of [{name:'jsDelivr',root:'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@'+version+'/'},{name:'unpkg',root:'https://unpkg.com/@mediapipe/tasks-vision@'+version+'/'}]){
  sources.push({name:item.name,moduleUrl:item.root+'vision_bundle.mjs',wasmUrl:item.root+'wasm',modelUrl:model});
 }
 return sources;
}
let faceDetector, pendingDetector;
export function getFaceExports(mod){
 const api=mod?.FaceDetector?mod:mod?.default;
 if(typeof api?.FaceDetector?.createFromOptions!=='function'||typeof api?.FilesetResolver?.forVisionTasks!=='function')throw Error('MediaPipe vision bundle did not export FaceDetector and FilesetResolver');
 return api;
}
export async function createFaceDetectorWithFallback(sources=faceRuntimeSources(),{importer=url=>import(url),onStatus=()=>{}}={}){
 const errors=[];
 for(const source of sources){
  try{
   onStatus('Loading face detector ('+source.name+')…');
   const api=getFaceExports(await importer(source.moduleUrl));
   const wasm=await api.FilesetResolver.forVisionTasks(source.wasmUrl);
   const detector=await api.FaceDetector.createFromOptions(wasm,{baseOptions:{modelAssetPath:source.modelUrl},runningMode:'IMAGE',minDetectionConfidence:.55});
   if(typeof detector?.detect!=='function')throw Error('Detector missing detect()');
   onStatus('Face detector ready ('+source.name+')');
   return detector;
  }catch(e){errors.push(source.name+': '+(e?.message||String(e)));}
 }
 if(typeof globalThis.FaceDetector==='function'){
  try{
   const native=new globalThis.FaceDetector({fastMode:true,maxDetectedFaces:12});
   onStatus('Using built-in browser face detector');
   return {async detect(image){const faces=await native.detect(image);return {detections:faces.map(f=>({boundingBox:{originX:f.boundingBox.x,originY:f.boundingBox.y,width:f.boundingBox.width,height:f.boundingBox.height}}))}}};
  }catch(e){errors.push('browser detector: '+e.message)}
 }
 throw Error('Unable to load face analysis engine. '+errors.join(' | ')+'. GitHub Pages needs vendor/mediapipe/vision_bundle.mjs, matching WASM files and its model. CDN backup needs Internet.');
}
export async function getFaceDetector(onStatus=()=>{}){
 if(faceDetector)return faceDetector;
 if(!pendingDetector)pendingDetector=createFaceDetectorWithFallback(faceRuntimeSources(),{onStatus}).then(d=>(faceDetector=d)).finally(()=>{pendingDetector=null});
 return pendingDetector;
}
export function focusAt(frames=[],sourceTime,fallback=.5){
  if(!frames.length)return {x:fallback,y:.5,faces:0};
  let before=frames[0],after=frames.at(-1);
  for(let i=0;i<frames.length;i++){if(frames[i].time<=sourceTime)before=frames[i];if(frames[i].time>=sourceTime){after=frames[i];break;}}
  const f=before===after?0:clamp((sourceTime-before.time)/(after.time-before.time),0,1);
  return {x:before.x+(after.x-before.x)*f,y:before.y+(after.y-before.y)*f,faces:Math.round(before.faces+(after.faces-before.faces)*f)};
}
function seekVideo(video,time,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(Error('Face scan cancelled'));let timer;const done=(err)=>{clearTimeout(timer);video.removeEventListener('seeked',ready);video.removeEventListener('error',bad);signal?.removeEventListener('abort',cancel);err?reject(err):resolve()};const ready=()=>done();const bad=()=>done(Error('Video seek failed; codec may be unsupported'));const cancel=()=>done(Error('Face scan cancelled'));video.addEventListener('seeked',ready,{once:true});video.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',cancel,{once:true});timer=setTimeout(()=>done(Error('Timed out seeking source video')),12000);try{video.currentTime=Math.min(Math.max(0,time),Math.max(0,(video.duration||time)-.01));if(Math.abs(video.currentTime-time)<.03&&video.readyState>=2)done()}catch(e){done(e)}})}
/** Returns real detection samples. Largest detected face is followed; this is not identity recognition. */
export async function scanFaces(file,{step=2,maxSamples=300,signal,onProgress=()=>{}}={}){
  const detector=await getFaceDetector(message=>onProgress(0,message)),url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.preload='auto';video.playsInline=true;video.src=url;
  try{
    await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('Browser cannot decode this video for face analysis'));video.load()});
    const duration=video.duration;if(!Number.isFinite(duration)||duration<=0)throw Error('Video duration is unknown');
    const interval=Math.max(.4,Math.max(step,duration/maxSamples)),frames=[];
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=Math.max(1,Math.round(480*video.videoHeight/video.videoWidth));const ctx=canvas.getContext('2d');
    let last={x:.5,y:.5};for(let t=0;t<duration;t+=interval){if(signal?.aborted)throw Error('Face scan cancelled');await seekVideo(video,t,signal);ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const hits=(await detector.detect(canvas))?.detections||[];const boxes=hits.map(d=>d.boundingBox).filter(Boolean).sort((a,b)=>b.width*b.height-a.width*a.height);
      if(boxes.length){const b=boxes[0];last={x:clamp((b.originX+b.width/2)/canvas.width,0,1),y:clamp((b.originY+b.height/2)/canvas.height,0,1)}}
      frames.push({time:+t.toFixed(2),x:+last.x.toFixed(4),y:+last.y.toFixed(4),faces:boxes.length});onProgress(Math.min(1,(t+interval)/duration),`Scanning frames ${frames.length} · ${boxes.length} face(s)`);
    }return frames;
  }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
}
