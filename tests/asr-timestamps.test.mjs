import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeWindow,wordsFromResult,isAttentionTimestampError} from '../src/asr.js';
const samples=new Float32Array(16000);
test('cross-attention failure falls back to segment timestamp and remembers result',async()=>{
 const calls=[],whisper=async(_,opt)=>{calls.push(opt.return_timestamps);if(opt.return_timestamps==='word')throw Error('Model outputs must contain cross attentions to extract timestamps. This is most likely because the model was not exported with output_attentions=True.');return {text:'Hello everyone',chunks:[{text:'Hello everyone',timestamp:[.1,.9]}]};};
 const r=await recognizeWindow(whisper,samples,{modelKey:'no-attention',preference:'word'}});
 assert.equal(r.mode,'segment');assert.deepEqual(calls,['word',true]);
 const words=wordsFromResult(r.result,'a',10,1,r.mode);assert.equal(words.length,2);assert.equal(words[0].timing,'estimated');assert.ok(Math.abs(words[0].start-10.1)<.0001);
 await recognizeWindow(whisper,samples,{modelKey:'no-attention',preference:'word'}});assert.deepEqual(calls,['word',true,true]);
});
test('segment timestamp failure uses plain transcription without stopping',async()=>{
 const calls=[],fn=async(_,opts)=>{calls.push(opts.return_timestamps);if(opts.return_timestamps==='word')throw Error('cross attentions missing');if(opts.return_timestamps===true)throw Error('return_timestamps not supported');return {text:'Transcription succeeded'};};
 const r=await recognizeWindow(fn,samples,{modelKey:'plain-test',preference:'word'}});assert.equal(r.mode,'plain');assert.deepEqual(calls,['word',true,false]);
 assert.ok(wordsFromResult(r.result,'asset',0,1,r.mode).every(w=>w.timing==='estimated'));
 await recognizeWindow(fn,samples,{modelKey:'plain-test',preference:'word'}});assert.deepEqual(calls,['word',true,false,false]);
});
test('working word alignment preserves timestamps',async()=>{
 const r=await recognizeWindow(async()=>({text:'Hi there',chunks:[{text:' Hi',timestamp:[.1,.4]},{text:' there',timestamp:[.5,.8]}]}),samples,{modelKey:'word-test',preference:'word'}});
 assert.equal(r.mode,'word');assert.deepEqual(wordsFromResult(r.result,'a',0,1,r.mode).map(w=>w.timing),['model-word','model-word']);
});
test('user may choose segment mode to skip word alignment',async()=>{
 const calls=[];await recognizeWindow(async(_,opt)=>{calls.push(opt.return_timestamps);return {text:'ok'};},samples,{modelKey:'segment-pref',preference:'segment'});assert.deepEqual(calls,[true]);
});
test('unrelated runtime errors remain visible',async()=>{
 const calls=[];await assert.rejects(recognizeWindow(async(_,opt)=>{calls.push(opt.return_timestamps);throw Error('WebGPU device lost');},samples,{modelKey:'device-error',preference:'word'}}),/device lost/);assert.deepEqual(calls,['word']);
});
test('invalid timestamp ends never create negative duration',()=>{
 const words=wordsFromResult({chunks:[{text:'a b',timestamp:[0,null]},{text:'c',timestamp:[.95,0]}]},'asset',4,1,'segment');
 assert.equal(words.length,3);assert.ok(words.every(w=>w.end>w.start&&w.end<=5));
});
test('real error is classified as attention incompatibility',()=>{
 assert.equal(isAttentionTimestampError(new Error('Model outputs must contain cross attentions to extract timestamps')),true);
 assert.equal(isAttentionTimestampError(new Error('Network temporarily unavailable')),false);
});
