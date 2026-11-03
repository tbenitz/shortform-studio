import test from 'node:test';import assert from 'node:assert/strict';
import {audioBuckets,findAudioCombatBursts,frameDifference,chooseVisualTimestamps,scanGameplay} from '../src/gameplay-analysis.js';
test('silence has no invented combat events',()=>{const x=audioBuckets(new Float32Array(16000*5));assert.equal(x.length,5);assert.deepEqual(findAudioCombatBursts(x),[])});
test('audio bursts are indexed with real source timestamps',()=>{
 const data=[];for(let t=0;t<120;t++)data.push({time:t,rms:t>60&&t<80?.48:.045,texture:t>60&&t<80?.09:.009,transients:t>60&&t<80?15:0});
 const moments=findAudioCombatBursts(data);assert.ok(moments.some(e=>e.start>=55&&e.end<=86));assert.ok(moments.every(e=>e.kind==='possible-combat-audio'));
});
test('sample video timestamps span a 3-hour file and prioritize intense activity',()=>{
 const moments=Array.from({length:80},(_,i)=>({peakTime:i*120+30,score:.8,start:i*120+29,end:i*120+34}));
 const t=chooseVisualTimestamps(moments,10800,{limit:300});assert.ok(t.length<=300);assert.ok(t[0]<100);assert.ok(t.at(-1)>9300);
});
test('frame comparison distinguishes unchanged frames and strong screen change',()=>{
 const a=new Uint8ClampedArray(160*90*4),b=new Uint8ClampedArray(160*90*4).fill(255);
 assert.equal(frameDifference(a,a),0);assert.ok(frameDifference(a,b)>.7);
});
test('three-hour source uses 24-second bounded audio reads without loading whole file',async()=>{
 const reads=[],file={size:5e9,arrayBuffer(){throw Error('whole file read must not happen')}};
 const reader={duration:10800,async readRange(a,b){reads.push([a,b]);return new Float32Array(Math.round((b-a)*16000))},close(){}};
 const scans=[],checkpoint=[];
 const result=await scanGameplay(file,{readerFactory:async()=>reader,videoScanner:async(_,times)=>{scans.push(times.length);return []},onCheckpoint:async x=>{checkpoint.push(x.processed)}});
 assert.equal(result.status,'complete');assert.equal(reads.length,450);assert.ok(reads.every(([a,b])=>b-a<=24));assert.equal(result.audio.length,10800);assert.ok(checkpoint.length>=40);assert.ok(scans[0]>100);
});
