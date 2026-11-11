import test from 'node:test';
import assert from 'node:assert/strict';
import {findCallbackThreads,inspectMomentCutoff,sourceDialogueBeats} from '../src/humor-context.js';
import {cropMotionProgress,cropKeyframes} from '../src/crop-motion.js';
import {auditPovSwitches} from '../src/pov-switch-audit.js';
import {frameReceipt} from '../src/evidence-frame.js';
const w=(text,start,end,assetId='v',cue='c1')=>({text,start,end,assetId,subtitleCueId:cue,speaker:'Speaker 1'});
const m=(id,start,end,dialogue,assetId='v')=>({id,start,end,dialogue,assetId});
test('IDEA-001: links only separated actual-source moments with two repeated concrete subject words',()=>{
 const sample=[
  m('setup',5,15,'The helicopter clipped the pine tree'),
  m('unrelated',20,35,'I really love riding new bikes'),
  m('callback',90,104,'The helicopter flew right into that pine tree again'),
  m('wrong-camera',95,105,'The helicopter flew right into that pine tree again','b'),
  m('no-topic',160,170,'Wow that is hilarious'),
 ];
 const c=findCallbackThreads(sample,{minGap:25,minTopics:2});
 assert(c.some(x=>x.momentIds.join(',')==='setup,callback'),JSON.stringify(c));
 assert(c.every(x=>x.assetId==='v'));
 assert(c.every(x=>x.gap>=25));
 assert(c.every(x=>x.terms.length>=2));
 assert(c.every(x=>x.reason.includes('Possible spoken callback')));
});
test('IDEA-002: opening and ending receipts use genuine source words and exact timestamps',()=>{
 const actual=[w('Why',10,10.4),w('helicopter?',10.4,11),w('Because',11.5,12),w('trees!',12,13),w('Hahaha!',13.1,13.5)];
 const d=sourceDialogueBeats(m('j',9.8,14,'A candidate invented summary'),actual);
 assert.equal(d.count,5);assert.equal(d.opening.time,10);assert.equal(d.ending.time,13.1);
 assert.match(d.evidence,/NOT automatically verified joke/);
 assert.equal(sourceDialogueBeats(m('j',20,21,'No source'),actual).opening,null);
});
test('IDEA-010: warn only on real subtitle cue cutoffs, not unrelated later sentences',()=>{
 const words=[w('Why',1,1.5),w('are',1.5,2),w('you',2.2,2.5),w('there?',2.5,3),w('Different',3.8,4.2,'v','other')];
 assert.equal(inspectMomentCutoff(m('clip',1.4,2.1,'Why are'),words).after,true);
 assert.equal(inspectMomentCutoff(m('clip',1.7,2.9,'are you'),words).before,true);
 assert.equal(inspectMomentCutoff(m('clip',1,3.1,'Complete cue'),words).after,false);
 assert.equal(inspectMomentCutoff(m('clip',4,5,'Different'),words).after,false);
 assert.equal(inspectMomentCutoff(m('clip',1.4,2.1,'unmatched'),words.filter(w=>w.assetId==='x')).reasons.length,0);
});
test('PLAN-065/075: stable zoom endpoints, smooth keyed motion and legacy linear mode',()=>{
 const seg={zoom:1,zoomEnd:3,focusX:.2,focusEndX:.8,focusY:.25,focusEndY:.75,cropEasing:'smooth'};
 assert.deepEqual(cropKeyframes(seg,0),{progress:0,zoom:1,x:.2,y:.25});
 assert.equal(cropMotionProgress(.25,'smooth'),.15625);
 assert.equal(cropKeyframes(seg,.25).zoom,1.3125);
 assert.equal(cropKeyframes(seg,.5).zoom,2);
 assert.equal(cropKeyframes(seg,1).x,.8);
 assert.equal(cropMotionProgress(.25,'linear'),.25);
 assert.equal(cropMotionProgress(.25,'ease-in'),.0625);
 assert.equal(cropMotionProgress(.25,'ease-out'),.4375);
 assert.equal(cropMotionProgress(-4,'smooth'),0);
 assert.equal(cropMotionProgress(4,'smooth'),1);
 assert.equal(cropKeyframes({...seg,cropEasing:undefined},.25).zoom,1.5,'Old projects are still linear');
});
test('PLAN-060/061/062: unsupported second camera is refused without same-source paired audio and decoded motion',()=>{
 const sync={referenceId:'a',targetId:'b',offset:0,scale:1};
 const clips=[{assetId:'a',start:1,end:10},{assetId:'b',start:10,end:20}];
 const events=[{assetId:'a',kind:'audio',globalTime:7,score:.25},
  {assetId:'b',kind:'dialogue',globalTime:12,score:1,tags:['combat']}];
 const bad=auditPovSwitches(clips,events,sync);
 assert.equal(bad.status,'unsafe');assert.equal(bad.safeToAutoUse,false);
 assert.equal(bad.switches[0].status,'unsupported');
 assert.match(bad.issues[0],/No paired source audio/);
 const real=[...events,{assetId:'b',kind:'audio',globalTime:12,score:.9},
  {assetId:'b',kind:'motion',globalTime:13,score:.86}];
 const accepted=auditPovSwitches(clips,real,sync);
 assert.equal(accepted.safeToAutoUse,true);assert.equal(accepted.switches.length,1);
 assert.equal(accepted.switches[0].status,'supported');
 assert(accepted.switches[0].pairs.length);
 const uncertain=auditPovSwitches(clips,[...real,{assetId:'a',kind:'audio',globalTime:12,score:.99},{assetId:'a',kind:'motion',globalTime:13,score:.99}],sync);
 assert(uncertain.issues.length>0,'Conflicting evidence should be surfaced, not hidden');
});
test('PLAN-055: frame receipt points only into a known original video and a bounded cut',()=>{
 const video={id:'v',name:'Original.mp4',type:'video',duration:100};
 const candidate={segments:[{assetId:'v',start:20,end:30}]};
 assert.deepEqual(frameReceipt(candidate,[video]),{assetId:'v',name:'Original.mp4',start:20,end:30,time:25,segmentIndex:0,requiresDecodedFrame:true});
 assert.equal(frameReceipt(candidate,[video],0,{fraction:3}).time,30);
 assert.throws(()=>frameReceipt({segments:[{assetId:'fake',start:0,end:10}]},[video]),/no original video/);
 assert.throws(()=>frameReceipt({segments:[{assetId:'v',start:30,end:130}]},[video]),/duration/);
 assert.throws(()=>frameReceipt({segments:[{assetId:'v',start:20,end:20}]},[video]),/valid actual/);
});
