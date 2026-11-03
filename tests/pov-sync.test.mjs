import test from 'node:test';import assert from 'node:assert/strict';
import {transcriptAnchors,estimateTranscriptSync,syncFromTranscripts,referenceToTarget,targetToReference,checkSynchronization} from '../src/pov-sync.js';
const phrases=[
'right behind this building right now',
'wait i think i see another squad',
'hold on i am going to flank them',
'watch the stairs someone is coming',
'we have to get our teammate up',
'you should probably run toward the bridge',
'what a strange way to end this game',
'get behind the vehicle and use cover',
'one last time we will push together',
'look to your left and throw smoke'
];
function transcript(id,offset=0,scale=1){
 const out=[];for(let i=0;i<phrases.length;i++)for(const [j,part] of phrases[i].split(' ').entries()){
  const start=i*1050+15+j*.32;
  out.push({assetId:id,text:part,start:start*scale+offset,end:(start+.30)*scale+offset});
 }return out;
}
test('matches shared spoken phrases across three-hour recordings with offset and clock drift',()=>{
 const words=[...transcript('pov1'),...transcript('pov2',-173,1.0003)];
 const result=syncFromTranscripts(words,'pov1','pov2');
 assert.equal(result.status,'matched');assert.ok(result.inliers>=6);
 assert.ok(Math.abs(result.offset+173)<1.1,JSON.stringify(result));
 assert.ok(Math.abs(result.scale-1.0003)<.0002,JSON.stringify(result));
 assert.ok(Math.abs(targetToReference(referenceToTarget(9200,result),result)-9200)<.01);
});
test('rejects unrelated recordings instead of inventing an offset',()=>{
 const a=transcript('a'),b=[{assetId:'b',text:'unrelated',start:5,end:6}];
 assert.equal(syncFromTranscripts([...a,...b],'a','b').status,'insufficient');
});
test('repeated two-word phrases alone do not count as reliable sync anchors',()=>{
 const words=[...Array.from({length:40},(_,i)=>({assetId:'a',text:'enemy',start:i*20,end:i*20+1})),
 ...Array.from({length:40},(_,i)=>({assetId:'b',text:'enemy',start:i*35,end:i*35+1}))];
 assert.equal(transcriptAnchors(words,'a','b').length,0);
});
test('outlier speech timestamps do not bias shared phrase alignment',()=>{
 const data=[...transcript('one'),...transcript('two',125)];
 const result=estimateTranscriptSync([
  ...transcriptAnchors(data,'one','two'),
  {referenceTime:2000,targetTime:9300,phrase:'false match',weight:.5},
  {referenceTime:4000,targetTime:10,phrase:'different words',weight:.5}
 ]);
 assert.equal(result.status,'matched');assert.ok(Math.abs(result.offset-125)<1);
});
test('overlap is validated against both original video durations',()=>{
 const sync={offset:600,scale:1,referenceId:'a',targetId:'b'};
 assert.equal(checkSynchronization(sync,10800,10800).valid,true);
 assert.equal(checkSynchronization(sync,100,100).valid,false);
});
