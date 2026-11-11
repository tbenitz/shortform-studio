import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceToTimelineTime,appendLiveWords} from '../src/live-captions.js';
import {transcribeWithReader} from '../src/asr.js';
test('new transcript chunks immediately replace caption word-array identity',()=>{
 const before=[{text:'hello'}],incoming=[{text:'world'}],after=appendLiveWords(before,incoming);
 assert.notEqual(after,before);assert.equal(after.length,2);assert.equal(after[1].text,'world');
});
test('seek to the actual project position for a video even after nonlinear edits',()=>{
 const segs=[{assetId:'a',start:50,end:70,speed:1},{assetId:'b',start:0,end:5,speed:1},{assetId:'a',start:150,end:170,speed:2}];
 assert.equal(sourceToTimelineTime(segs,'a',60),10);
 assert.equal(sourceToTimelineTime(segs,'a',160),30);
 assert.equal(sourceToTimelineTime(segs,'a',100),null);
});
test('a new partial caption batch arrives for every Whisper window, before its source-window checkpoint',async()=>{
 const events=[],reader={duration:36,async readRange(){return new Float32Array(80)}};
 const whisper=async()=>({text:'caption generated'});
 const p=await transcribeWithReader(reader,'asset',{transcriptionChunk:12,transcriptionTiming:'plain',whisperModel:'tiny'},whisper,()=>{},()=>false,{
  onPartial:async info=>events.push(['partial',info.from,info.words.length,info.to]),
  onCheckpoint:async info=>events.push(['checkpoint',info.nextAt,info.words.length])
 });
 assert.equal(p.nextAt,36);
 assert.deepEqual(events.map(e=>e[0]),['partial','checkpoint','partial','checkpoint','partial','checkpoint']);
 assert.ok(events.filter(e=>e[0]==='partial').every(e=>e[2]>0));
 assert.deepEqual(events.filter(e=>e[0]==='checkpoint').map(e=>e[1]),[12,24,36]);
});
