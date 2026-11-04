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

test('long PvP scan resumes saved audio checkpoint instead of decoding from zero',async()=>{
 const reads=[],resume={version:2,status:'scanning',window:{start:0,end:10800},duration:10800,processed:2400,audio:[{time:0,rms:.02,texture:.01,transients:0}]};
 const fake={duration:10800,async readRange(a,b){reads.push([a,b]);return new Float32Array(Math.round((b-a)*16000))},close(){}};
 const done=await scanGameplay({},{readerFactory:async()=>fake,videoScanner:async()=>[],resume});
 assert.ok(reads[0][0]>=2376);
 assert.equal(done.status,'complete');assert.equal(done.processed,10800);
});

test('quiet game sound is part of the baseline, allowing real loud fight audio to stand out',()=>{
 const buckets=Array.from({length:80},(_,time)=>({
  time,rms:(time>=9&&time<18)||(time>=51&&time<60)?.14:.0022,
  texture:(time>=9&&time<18)||(time>=51&&time<60)?.07:.0002,transients:0
 }));
 const bursts=findAudioCombatBursts(buckets);
 assert.ok(bursts.length>=2,'Expected two fights to be found, got '+JSON.stringify(bursts));
 assert.ok(bursts[0].peakTime>=8&&bursts[0].peakTime<=18);
 assert.ok(bursts.at(-1).peakTime>50);
});

test('multi-camera overlap scan decodes no audio or frames outside its source window',async()=>{
 const reads=[],seenFrames=[];
 const fake={duration:20000,async readRange(a,b){reads.push([a,b]);return new Float32Array(Math.round((b-a)*16000))},close(){}};
 const track=await scanGameplay({}, {window:{start:7000,end:7120},readerFactory:async()=>fake,
  videoScanner:async(_,times)=>{seenFrames.push(...times);return []}});
 assert.equal(track.duration,20000);
 assert.deepEqual(track.window,{start:7000,end:7120});
 assert.ok(reads.length<=5&&reads.length>=5);
 assert.ok(reads.every(([a,b])=>a>=7000&&b<=7120&&b-a<=24));
 assert.ok(seenFrames.every(t=>t>=7000&&t<7120));
 assert.equal(track.audio.length,120);
});
