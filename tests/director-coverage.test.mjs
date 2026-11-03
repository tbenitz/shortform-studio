import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverFullRecording,clipSignature,clipAnchor,sourceCoverage,historyEntries,selectDiverseCandidates} from '../src/director-coverage.js';
const wordsInRecording=()=>{
 const list=[];for(let i=0;i<1200;i++){const start=i*9;
  list.push({id:'u'+i,assetId:'three-hours',start,end:start+4,duration:4,text:i%3===0?'What went wrong because we predicted this and everyone laughed':'The result is important because it explains our whole discussion',keywords:['predict','result','discussion','laugh','explain'],speaker:'Speaker 1'});
 }return list;
};
const asset={id:'three-hours',name:'Three-hour test',type:'video',duration:10800};
test('full 3-hour recording produces hundreds of proposals distributed across ALL three hours',()=>{
 const list=wordsInRecording(),clips=discoverFullRecording(list,[asset],{clipMin:12,clipMax:45,clipCount:0,mode:'all',minScore:0,allowNonlinear:true});
 assert.ok(clips.length>=100,'expected many clips, got '+clips.length);
 const hours=new Set(clips.map(c=>Math.floor(clipAnchor(c).time/3600)));
 assert.deepEqual([...hours].sort(),[0,1,2]);
 const buckets=new Set(clips.map(c=>Math.floor(clipAnchor(c).time/300)));
 assert.ok(buckets.size>=30,'expected clips across at least 30 5-min source blocks, got '+buckets.size);
 assert.ok(new Set(clips.map(clipSignature)).size===clips.length);
});
test('new searches do not regenerate previously selected source moments',()=>{
 const list=wordsInRecording(),options={clipMin:12,clipMax:45,clipCount:35,mode:'all',minScore:0};
 const first=discoverFullRecording(list,[asset],options);
 const second=discoverFullRecording(list,[asset],{...options,history:historyEntries(first),existingCandidates:first});
 assert.ok(second.length>0);assert.equal(new Set(first.map(clipSignature).filter(s=>second.some(c=>clipSignature(c)===s))).size,0);
 assert.ok(second.every(c=>first.every(d=>Math.abs(clipAnchor(c).time-clipAnchor(d).time)>=5)));
});
test('coverage explicitly reports when only first minute of a three-hour video is transcribed',()=>{
 const words=Array.from({length:20},(_,i)=>({assetId:'three-hours',start:i*3,end:i*3+1}));
 const stats=sourceCoverage([asset],words,{'three-hours':{nextAt:60,status:'paused'}},[]);
 assert.equal(stats.totalSeconds,10800);
 assert.equal(stats.totalBins,36);assert.equal(stats.coveredBins,1);
 assert.ok(stats.percent<1);
});
test('history survives cleared cards without recycling primary anchors',()=>{
 const list=wordsInRecording(),options={clipMin:12,clipMax:45,clipCount:22,mode:'all',minScore:0};
 const first=discoverFullRecording(list,[asset],options);
 const afterClear=discoverFullRecording(list,[asset],{...options,history:historyEntries(first),existingCandidates:[]});
 assert.equal(afterClear.filter(c=>first.some(f=>clipSignature(f)===clipSignature(c))).length,0);
});
test('exhaustive discovery does not use unstable generated moment ids',()=>{
 const list=wordsInRecording();const a=discoverFullRecording(list,[asset],{clipCount:5,mode:'all'}),b=discoverFullRecording(list,[asset],{clipCount:5,mode:'all'});
 assert.deepEqual(a.map(clipSignature),b.map(clipSignature));
});
