import test from 'node:test';
import assert from 'node:assert/strict';
import {createFaceDetectorWithFallback,faceRuntimeSources,getFaceExports} from '../src/faces.js';
const source=name=>({name,moduleUrl:'mock:'+name+'/vision_bundle.mjs',wasmUrl:'mock:'+name+'/wasm',modelUrl:'mock:'+name+'/face.tflite'});
const fakeApi=events=>({
 FilesetResolver:{async forVisionTasks(url){events.push(['wasm',url]);return {url}}},
 FaceDetector:{async createFromOptions(wasm,options){events.push(['detector',wasm.url,options.baseOptions.modelAssetPath]);return {detect(){return {detections:[]}}}}},
});
test('same-origin bundled face runtime is first; CDN fallbacks use full bundle, not +esm',()=>{
 const [local,jsdelivr,unpkg]=faceRuntimeSources();assert.equal(local.name,'bundled');
 assert.match(local.moduleUrl,/\/vendor\/mediapipe\/vision_bundle\.mjs$/);
 assert.ok(local.wasmUrl.startsWith(new URL('./',local.moduleUrl).href));
 assert.ok(jsdelivr.moduleUrl.endsWith('/vision_bundle.mjs'));assert.ok(!jsdelivr.moduleUrl.includes('+esm'));
 assert.ok(jsdelivr.wasmUrl.startsWith('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/'));
 assert.ok(unpkg.wasmUrl.startsWith('https://unpkg.com/@mediapipe/tasks-vision@0.10.22/'));
});
test('supports default exports as well as named module exports',()=>{
 const api=fakeApi([]);assert.equal(getFaceExports({default:api}),api);assert.equal(getFaceExports(api),api);
 assert.throws(()=>getFaceExports({}),/did not export/);
});
test('bundled detector succeeds without any CDN requests',async()=>{
 const events=[],src=[source('local'),source('cdn')];
 const detector=await createFaceDetectorWithFallback(src,{importer:async url=>{events.push(['import',url]);return fakeApi(events)}});
 assert.equal(typeof detector.detect,'function');assert.deepEqual(events.map(x=>x[0]),['import','wasm','detector']);
 assert.deepEqual(events.at(-1),['detector',src[0].wasmUrl,src[0].modelUrl]);
});
test('bad local import falls back to second complete runtime',async()=>{
 const events=[],src=[source('local'),source('cdn')];
 await createFaceDetectorWithFallback(src,{importer:async url=>{events.push(url);if(url.includes('local'))throw Error('404');return {default:fakeApi(events)}}});
 assert.deepEqual(events.slice(0,2),[src[0].moduleUrl,src[1].moduleUrl]);
 assert.deepEqual(events.at(-1),['detector',src[1].wasmUrl,src[1].modelUrl]);
});
test('WASM initialization failure falls back to next candidate',async()=>{
 const src=[source('local'),source('cdn')],events=[];
 const detector=await createFaceDetectorWithFallback(src,{importer:async()=>({FilesetResolver:{async forVisionTasks(url){events.push(url);if(url.includes('local'))throw Error('WASM missing');return url}},FaceDetector:{async createFromOptions(){return {detect:()=>({detections:[]})}}}})});
 assert.equal(typeof detector.detect,'function');assert.deepEqual(events,[src[0].wasmUrl,src[1].wasmUrl]);
});
test('all failures produce diagnostics instead of an opaque dynamic-import error',async()=>{
 await assert.rejects(createFaceDetectorWithFallback([source('local'),source('cdn')],{importer:async()=>{throw Error('blocked')}}),e=>e.message.includes('vendor/mediapipe/')&&e.message.includes('local:')&&e.message.includes('cdn:'));
});
