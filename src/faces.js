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
/** Reject videos that have metadata but no decoded image geometry. A NaN canvas
 * height is coerced to zero by the DOM, causing MediaPipe's internal ROI failure. */
export function faceFrameSize(video,maxEdge=480){
 const w=Number(video?.videoWidth),h=Number(video?.videoHeight);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2)
  throw Error('No decoded video frame size yet. Wait until the video has loaded visible frames before face analysis.');
 const scale=Math.min(1,Math.max(64,Math.min(1024,maxEdge))/Math.max(w,h));
 const width=Math.max(2,Math.round(w*scale)),height=Math.max(2,Math.round(h*scale));
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<2||height<2)throw Error('Invalid face-analysis frame dimensions');
 return {width,height};
}
export const isInvalidFaceROIError=e=>/ROI width and height must be > 0|roi->width > 0|image_to_tensor_utils\.cc:\d+/i.test(String(e?.message||e));
/** Wait until a REAL decoded frame exists; loadedmetadata alone is not enough. */
export function waitForFaceFrame(video,{signal,timeoutMs=12000,targetTime=null}={}){
 return new Promise((resolve,reject)=>{
  let done=false,timer;
  const events=['loadeddata','canplay','seeked','resize','timeupdate'];
  const cleanup=()=>{clearTimeout(timer);for(const event of events)video.removeEventListener(event,check);video.removeEventListener('error',fail);signal?.removeEventListener('abort',cancel)};
  const finish=err=>{if(done)return;done=true;cleanup();err?reject(err):resolve()};
  const cancel=()=>finish(Error('Face scan cancelled'));
  const fail=()=>finish(Error('Unable to decode the selected video frame'));
  const check=()=>{
   if(signal?.aborted)return cancel();
   if(video.error)return fail();
   if(video.seeking||video.readyState<2)return;
   try{faceFrameSize(video)}catch{return}
   if(targetTime!=null&&Math.abs(Number(video.currentTime)-targetTime)>.18)return;
   finish();
  };
  for(const event of events)video.addEventListener(event,check);
  video.addEventListener('error',fail,{once:true});
  signal?.addEventListener('abort',cancel,{once:true});
  timer=setTimeout(()=>finish(Error('Timed out decoding a usable video frame. This file may use a codec Chrome cannot decode.')),timeoutMs);
  check();
 });
}
async function seekFaceFrame(video,time,signal){
 const duration=Number(video.duration);
 if(!Number.isFinite(duration)||duration<=0)throw Error('Video has no finite duration');
 const target=Math.max(0,Math.min(Math.max(0,duration-.05),time));
 try{if(Math.abs(Number(video.currentTime)-target)>.02||video.readyState<2)video.currentTime=target}
 catch(e){throw Error('Could not seek video during face analysis: '+e.message)}
 await waitForFaceFrame(video,{signal,targetTime:target});
}
/** Scans only decoded, dimension-checked frames. Invalid frame failures are
 * reported and skipped instead of aborting the entire source immediately. */
export async function scanFaces(file,{step=2,maxSamples=300,signal,onProgress=()=>{}}={}){
 let detector=await getFaceDetector(message=>onProgress(0,message));
 const url=URL.createObjectURL(file);
 const video=document.createElement('video');
 video.muted=true;video.preload='auto';video.playsInline=true;video.src=url;
 try{
  await new Promise((resolve,reject)=>{
   if(signal?.aborted)return reject(Error('Face scan cancelled'));
   const ok=()=>{cleanup();resolve()};
   const bad=()=>{cleanup();reject(Error('Browser cannot open this video for face analysis'))};
   const cancel=()=>{cleanup();reject(Error('Face scan cancelled'))};
   const cleanup=()=>{video.removeEventListener('loadedmetadata',ok);video.removeEventListener('error',bad);signal?.removeEventListener('abort',cancel)};
   video.addEventListener('loadedmetadata',ok,{once:true});video.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',cancel,{once:true});video.load();
  });
  const duration=Number(video.duration);
  if(!Number.isFinite(duration)||duration<=0)throw Error('Face analysis requires a video with known, finite duration');
  // Metadata may arrive with videoWidth=videoHeight=0. Never size a canvas yet.
  await waitForFaceFrame(video,{signal});
  const canvas=document.createElement('canvas');
  let {width,height}=faceFrameSize(video);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Canvas 2D rendering is unavailable');
  const safeStep=Number.isFinite(step)&&step>0?step:2;
  const limit=Number.isFinite(maxSamples)&&maxSamples>0?Math.max(1,Math.floor(maxSamples)):300;
  const interval=Math.max(.4,safeStep,duration/limit);
  const frames=[];let failures=0,consecutiveFailures=0,last={x:.5,y:.5};
  for(let t=0;t<duration;t+=interval){
   if(signal?.aborted)throw Error('Face scan cancelled');
   await seekFaceFrame(video,t,signal);
   ({width,height}=faceFrameSize(video));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
   if(!canvas.width||!canvas.height)throw Error('Video frame dimensions are zero; refusing to run face detection');
   ctx.drawImage(video,0,0,width,height);
   let hits;
   try{
    hits=(await detector.detect(canvas))?.detections||[];
    consecutiveFailures=0;
   }catch(e){
    if(!isInvalidFaceROIError(e))throw Error('Face detector failed around '+t.toFixed(2)+'s: '+e.message);
    failures++;consecutiveFailures++;
    if(consecutiveFailures>3||failures>Math.max(4,Math.ceil(limit*.1)))
     throw Error('Face detector rejected '+failures+' decoded frames as invalid. Try converting the video to a standard MP4 (H.264) or WebM. Last error: '+e.message);
    frames.push({time:+t.toFixed(2),x:last.x,y:last.y,faces:0,skipped:true});
    onProgress(Math.min(1,(t+interval)/duration),'Skipped invalid frame at '+t.toFixed(1)+'s; '+failures+' frame(s) skipped');
    // Graph can be left unusable after CalculatorGraph::Run() fails.
    try{faceDetector?.close?.()}catch{}
    faceDetector=null;detector=await getFaceDetector(message=>onProgress(Math.min(1,t/duration),message));
    continue;
   }
   const boxes=hits.map(d=>d.boundingBox).filter(b=>b&&Number.isFinite(b.width)&&Number.isFinite(b.height)&&b.width>0&&b.height>0&&Number.isFinite(b.originX)&&Number.isFinite(b.originY)).sort((a,b)=>b.width*b.height-a.width*a.height);
   if(boxes.length){
    const b=boxes[0];last={x:clamp((b.originX+b.width/2)/width,0,1),y:clamp((b.originY+b.height/2)/height,0,1)};
   }
   frames.push({time:+t.toFixed(2),x:+last.x.toFixed(4),y:+last.y.toFixed(4),faces:boxes.length});
   onProgress(Math.min(1,(t+interval)/duration),'Scanning frame '+frames.length+' · '+boxes.length+' face(s)'+(failures?' · '+failures+' skipped':''));
  }
  if(!frames.length)throw Error('No decoded video frames were available to scan');
  onProgress(1,'Face analysis complete: '+frames.length+' samples'+(failures?', '+failures+' invalid frames skipped':''));
  return frames;
 }finally{
  video.pause();video.removeAttribute('src');
  try{video.load()}catch{}
  URL.revokeObjectURL(url);
 }
}
