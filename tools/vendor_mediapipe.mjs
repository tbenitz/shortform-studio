/** Package pinned MediaPipe JS, WASM and face model for same-origin deployment. */
import {copyFile,cp,mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'node_modules/@mediapipe/tasks-vision');
const out=path.join(root,'vendor/mediapipe');
await mkdir(path.join(out,'wasm'),{recursive:true});
await mkdir(path.join(out,'models'),{recursive:true});
const pkg=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
if(pkg.version!=='0.10.22')throw Error('Unexpected MediaPipe version '+pkg.version);
await copyFile(path.join(source,'vision_bundle.mjs'),path.join(out,'vision_bundle.mjs'));
await cp(path.join(source,'wasm'),path.join(out,'wasm'),{recursive:true,force:true});
for(const file of ['vision_bundle.mjs','wasm/vision_wasm_internal.js','wasm/vision_wasm_internal.wasm']){
 const info=await stat(path.join(out,file));if(info.size<1024)throw Error('Invalid MediaPipe asset: '+file);
}
const modelUrl='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
let lastError;
for(let i=0;i<3;i++){
 try{
  const response=await fetch(modelUrl,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length<5000)throw Error('Face model download too small');
  await writeFile(path.join(out,'models/blaze_face_short_range.tflite'),data);
  lastError=null;break;
 }catch(e){lastError=e;console.warn('Face model attempt '+(i+1)+': '+e.message)}
}
if(lastError)throw Error('Unable to package face model: '+lastError.message);
console.log('Bundled MediaPipe '+pkg.version+' JavaScript, WASM and BlazeFace model locally.');
