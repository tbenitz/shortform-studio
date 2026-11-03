import test from 'node:test';import assert from 'node:assert/strict';
import {buildMultiPovHighlights,choosePovSegments,alignedPovEvents} from '../src/pov-director.js';
const sync={referenceId:'a',targetId:'b',offset:-180,scale:1,confidence:'high'};
const assets=[{id:'a',type:'video',name:'Player A',duration:10800},{id:'b',type:'video',name:'Player B',duration:10800}];
const word=(id,start,phrase)=>phrase.split(' ').map((text,j)=>({assetId:id,text,start:start+j*.3,end:start+(j+1)*.3,speaker:'S'}));
const tracks={
 a:{status:'complete',audio:[{}],events:[{start:3520,end:3525,peakTime:3522,score:.3},{start:3540,end:3548,peakTime:3543,score:.2}],motion:[{time:3521,motion:.25}]},
 b:{status:'complete',audio:[{}],events:[{start:3345,end:3350,peakTime:3347,score:.95},{start:3350,end:3362,peakTime:3354,score:.92}],motion:[{time:3348,motion:.98},{time:3355,motion:.9}]}
};
const words=[...word('a',3513,'enemy spotted on my left'),...word('a',3538,'I am down he killed me'),...word('b',3349,'I got him he is down')];
test('aligns gameplay events from both VODs to a single match clock',()=>{
 const e=alignedPovEvents(words,tracks,sync);
 assert.ok(e.some(x=>x.assetId==='b'&&Math.abs(x.globalTime-3527)<2));
 assert.ok(e.some(x=>x.assetId==='a'&&Math.abs(x.globalTime-3522)<2));
});
test('switches POV to second player when the second source has stronger combat signals',()=>{
 const events=alignedPovEvents(words,tracks,sync);
 const segments=choosePovSegments(events,sync,3510,3570,{chunkSeconds:7});
 assert.ok(segments.length>=2,JSON.stringify(segments));
 assert.ok(segments.some(s=>s.assetId==='b'));
 assert.ok(segments.some(s=>s.assetId==='a'));
 for(let i=1;i<segments.length;i++){
  const previous=segments[i-1],curr=segments[i];
  const end=previous.assetId==='a'?previous.end:previous.end+180;
  const start=curr.assetId==='a'?curr.start:curr.start+180;
  assert.ok(Math.abs(end-start)<.003);
 }
});
test('produces playable multi-source editing segments without falsely identifying a kill',()=>{
 const clips=buildMultiPovHighlights(words,assets,tracks,sync,{clipMin:20,clipMax:75,clipCount:0});
 assert.ok(clips.length>0);
 const clip=clips[0];
 assert.ok(clip.segments.length>=2,JSON.stringify(clip.segments));
 assert.ok(new Set(clip.segments.map(s=>s.assetId)).size===2);
 assert.ok(clip.reason.includes('NOT a verified kill feed'));
 assert.ok(clip.pov.globalStart>3000);
 assert.ok(clip.segments.every(s=>s.start>=0&&s.end<=10800));
});
test('declines to create multi-angle highlights when there is no matching event evidence',()=>{
 assert.deepEqual(buildMultiPovHighlights([],assets,{},sync,{clipMin:20}),[]);
});
