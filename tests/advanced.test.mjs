import test from 'node:test';import assert from 'node:assert/strict';
import {focusAt} from '../src/faces.js';
import {speakerSummary,relabelSpeaker,applySpeakerSegments} from '../src/speakers.js';
import {shotDistance} from '../src/scenes.js';
import {inspectStory,alternateOpener} from '../src/review.js';

test('face focal point interpolates between actual source samples',()=>{const frames=[{time:0,x:.2,y:.3,faces:1},{time:10,x:.8,y:.7,faces:2}];assert.ok(Math.abs(focusAt(frames,5).x-.5)<1e-9)});
test('speaker merge modifies only selected asset',()=>{const words=[{assetId:'a',speaker:'Speaker 4',start:0,end:1,text:'a'},{assetId:'b',speaker:'Speaker 4',start:0,end:1,text:'b'}];const renamed=relabelSpeaker(words,'Speaker 4','Speaker 1','a');assert.equal(renamed[0].speaker,'Speaker 1');assert.equal(renamed[1].speaker,'Speaker 4');assert.equal(speakerSummary(renamed,'a')[0].words,1);assert.equal(applySpeakerSegments(renamed,[{start:0,end:2,speaker:'Alice'}],'a')[0].speaker,'Alice')});
test('scene histogram change is normalized',()=>{assert.equal(shotDistance(new Float32Array(48),new Float32Array(48)),0);assert.ok(shotDistance(Float32Array.from({length:48},()=>1),new Float32Array(48))>0)});
test('story review calls out source chronology changes',()=>{const seg=[{assetId:'a',start:40,end:50,speed:1},{assetId:'a',start:0,end:12,speed:1}];const r=inspectStory(seg,[],[{id:'a'}]);assert.ok(r.issues.some(x=>x.message.includes('backwards')));assert.equal(alternateOpener(seg)[0].start,0);assert.equal(seg[0].start,40)});

test('long transcript sampling spans first and last source moments',async()=>{const {sampleAcrossTimeline}=await import('../src/director.js');const items=Array.from({length:2000},(_,i)=>({start:i}));const picked=sampleAcrossTimeline(items,120);assert.equal(picked.length,120);assert.equal(picked[0].start,0);assert.equal(picked.at(-1).start,1999)});
test('gap auditor inspects every active-sound section, not only first',async()=>{const {auditGaps,reconcileWords}=await import('../src/asr.js');const pcm=new Float32Array(16000*10);for(let i=0;i<pcm.length;i++){const t=i/16000;pcm[i]=t<3||(t>6&&t<9)? .22:0;}const missing=auditGaps(pcm,[],{minSeconds:1});assert.equal(missing.length,2);assert.ok(missing[1].start>5);const clean=reconcileWords([{start:1,end:1.2,text:'yes'},{start:1.05,end:1.22,text:'yes'},{start:2,end:2.1,text:'maybe'}]);assert.equal(clean.length,2)});
