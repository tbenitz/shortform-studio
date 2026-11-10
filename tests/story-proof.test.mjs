import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySourceCut,sourceTranscriptContext,analyzeStoryCut,inspectConnectedStory,deduplicateSourceCuts,chronologicalCuts,contextualCut,trimToSpokenDialogue,storyEditPlan} from '../src/story-proof.js';
const A={id:'a',name:'original.mp4',type:'video',duration:120,url:'blob:original'};
const W=[
 {assetId:'a',start:2,end:2.6,text:'Wait',speaker:'Alex'},
 {assetId:'a',start:2.7,end:3.5,text:'for the crash',speaker:'Alex'},
 {assetId:'a',start:4,end:4.9,text:'the helicopter crashed',speaker:'Alex'},
 {assetId:'a',start:5,end:5.8,text:'into the building!',speaker:'Alex'},
 {assetId:'a',start:6.3,end:7.3,text:'Hahaha no way!',speaker:'Blair'},
 {assetId:'a',start:8,end:9,text:'That is hilarious!',speaker:'Blair'},
 {assetId:'a',start:40,end:41,text:'helicopter crashed',speaker:'Alex'},
 {assetId:'a',start:42,end:43,text:'into the building again!',speaker:'Blair'}
];
const c=(id,start,end,assetId='a')=>({id,assetId,start,end,speed:1});
test('verifies actual source ID, in/out duration and relink state',()=>{
 assert.equal(verifySourceCut(c('x',3,6),[A]).ok,true);
 assert.equal(verifySourceCut(c('x',3,121),[A]).status,'out-of-range');
 assert.equal(verifySourceCut(c('x',9,8),[A]).status,'invalid');
 assert.equal(verifySourceCut(c('x',3,6,'not-real'),[A]).status,'missing');
 assert.equal(verifySourceCut(c('x',3,6),[{...A,url:null}]).status,'relink');
});
test('source context preserves actual words before/inside/after an interval',()=>{
 const r=sourceTranscriptContext(c('x',4,6),W,{seconds:4});
 assert.match(r.prior,/Wait/);assert.match(r.selectedText,/helicopter crashed/);
 assert.match(r.next,/Hahaha/);assert.equal(r.firstWord.start,4);
});
test('reports possible setup, payoff, reaction wording and speaker labels as uncertainty, not fake proof',()=>{
 const r=analyzeStoryCut(c('x',4,6),W,[A]);
 assert(r.issues.some(x=>x.code==='POSSIBLE_SETUP_CUT'));
 assert(r.issues.some(x=>x.code==='POSSIBLE_PAYOFF_CUT'));
 assert.match(r.transcript.selected,/helicopter crashed/);
 assert.match(r.scoreKind,/not a predicted engagement score/);
 assert(!r.evidence.some(x=>/visually verified/.test(x)));
});
test('detects reversed chronology, multiple recordings, repeated footage and topic drift',()=>{
 const wrong=inspectConnectedStory([c('a1',40,43),c('a2',4,7),c('a3',5,8),c('b',5,9,'b')],W,[A,{...A,id:'b',name:'second.mp4'}]);
 assert(wrong.duplicatePairs.length>0);
 assert(wrong.cuts[1].issues.some(x=>x.code==='REVERSED_CHRONOLOGY'));
 assert(wrong.cuts[2].issues.some(x=>x.code==='REPEATED_FOOTAGE'));
 assert(wrong.cuts[3].issues.some(x=>x.code==='CROSS_SOURCE_SYNC'));
 assert.equal(wrong.visualVerification,false);
});
test('dedupe never deletes original suggestions and cross-source chronology is refused',()=>{
 const clips=[c('a1',4,7),c('a2',4.4,6.5),c('a3',40,43)];
 const {kept,removed}=deduplicateSourceCuts(clips);
 assert.deepEqual(kept.map(x=>x.id),['a1','a3']);
 assert.equal(removed[0].cut.id,'a2');
 assert.deepEqual(chronologicalCuts([clips[2],clips[0]]).map(x=>x.id),['a1','a3']);
 assert.throws(()=>chronologicalCuts([clips[0],c('b',2,5,'b')]),/verified synchronization/);
});
test('context extension uses only actual timed dialogue, never arbitrary invented padding',()=>{
 const before=contextualCut(c('x',4,6),W,[A],{before:4,after:0});
 assert(before.start<4);assert.equal(before.end,6);
 const after=contextualCut(c('x',4,6),W,[A],{before:0,after:4});
 assert.equal(after.start,4);assert(after.end>=9);
 const noContext=contextualCut(c('x',100,105),W,[A],{before:4,after:4});
 assert.equal(noContext.start,100);assert.equal(noContext.end,105);
});
test('trim-to-spoken source words keeps real timestamps and refuses missing alignment',()=>{
 const clip=trimToSpokenDialogue(c('x',3.8,9.8),W,[A],{padding:.2});
 assert(clip.start>=3.8);assert(clip.end<=9.8);
 assert.throws(()=>trimToSpokenDialogue(c('x',60,62),W,[A]),/No timed original-source/);
});
test('edit plan contains real source references, source dialogue, story role and caveats',()=>{
 const cuts=[{...c('a1',4,6),storyRole:'setup'},c('a2',6,9)];
 const p={name:'Real funny conversation',words:W,assets:[A],segments:cuts};
 const plan=storyEditPlan(p,cuts,'append');
 assert.equal(plan.selections.length,2);assert.equal(plan.selections[0].assetId,'a');
 assert.equal(plan.selections[0].storyRole,'setup');
 assert.match(plan.selections[0].dialogue,/helicopter/);
 assert.equal(plan.review.meaningVerified,false);assert.equal(plan.review.cutCount,2);
});
