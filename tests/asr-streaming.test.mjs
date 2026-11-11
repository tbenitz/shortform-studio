import test from 'node:test';
import assert from 'node:assert/strict';
import {transcribeWithReader,mergeGapFlags} from '../src/asr.js';
test('full three-hour transcription uses bounded windows and preserves duration',async()=>{
 const ranges=[],progress=[],checkpoints=[],reader={duration:10800,async readRange(a,b){ranges.push([a,b]);return new Float32Array(80)}};
 const whisper=async()=>({text:'one two',chunks:[{text:'one two',timestamp:[0,2]}]});
 const r=await transcribeWithReader(reader,'video',{transcriptionChunk:20,whisperModel:'tiny',transcriptionTiming:'plain'},whisper,(n,msg)=>progress.push(n),()=>false,{onCheckpoint:async cp=>checkpoints.push(cp)});
 assert.equal(r.nextAt,10800);
 assert.equal(ranges.length,540);
 assert.ok(ranges.every(([a,b])=>b-a<=23&&a>=0&&b<=10800));
 assert.equal(checkpoints.at(-1).nextAt,10800);
 assert.ok(progress.at(-1)===1);
 assert.equal(checkpoints.length,540,'Every bounded original-source window must commit independently.');
 assert.ok(checkpoints.every((c,i)=>i===0?c.from===0:c.from===checkpoints[i-1].to),'Saved windows must have consecutive source-time boundaries');
});
test('resume starts at last saved checkpoint, never decodes first hours again',async()=>{
 const windows=[],reader={duration:10800,async readRange(a,b){windows.push([a,b]);return new Float32Array(32)}};
 const whisper=async()=>({text:'hello'});
 const r=await transcribeWithReader(reader,'video',{transcriptionChunk:20,transcriptionTiming:'plain',whisperModel:'tiny'},whisper,()=>{},()=>false,{startAt:10740});
 assert.equal(windows.length,3);assert.ok(windows[0][0]>10700);assert.equal(r.nextAt,10800);
});
test('failed/cancelled operation flushes prior completed work to callback',async()=>{
 const saved=[];let count=0;
 const reader={duration:120,async readRange(){return new Float32Array(80)}};
 const whisper=async()=>{count++;return {text:'good audio'}};
 await assert.rejects(transcribeWithReader(reader,'video',{transcriptionChunk:20,transcriptionTiming:'plain'},whisper,()=>{},()=>count>=2,{
  onCheckpoint:async info=>saved.push(info)
 }),/paused/);
 assert.ok(saved.length>=1);assert.ok(saved[0].nextAt>=40);
});
test('gap flags from neighboring windows merge safely',()=>{assert.equal(mergeGapFlags([{start:1,end:2},{start:2.1,end:3}]).length,1)});
