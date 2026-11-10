import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewWordRows,repairTimedWord,splitTimedWord,mergeTimedWord,transcriptReviewHTML} from '../src/transcript-review.js';
import {fitManualPovAnchors,manualPovOverlap,povManualSyncHTML} from '../src/pov-manual-review.js';
import {compareProjectVersions,actualProcessingStates,outboundDataDisclosure,productionReviewHTML} from '../src/production-review.js';

const base=()=>({
 id:'proj',name:'Recording',assets:[
  {id:'a',name:'First source.mp4',type:'video',duration:150,size:10000},
  {id:'b',name:'Second POV.mp4',type:'video',duration:150,size:11000}
 ],words:[
  {id:'w1',assetId:'a',start:20,end:21,text:'Hey',speaker:'Speaker 1',timing:'estimated'},
  {id:'w2',assetId:'a',start:21.1,end:22.1,text:'there',speaker:'Speaker 1',timing:'estimated'},
  {id:'w3',assetId:'a',start:30,end:31,text:'Stop now',speaker:'Speaker 2',timing:'estimated'}
 ],segments:[{id:'s1',assetId:'a',start:18,end:33,speed:1,title:'Clip'}],
 transcriptProgress:{a:{status:'paused',nextAt:40,total:150}},markers:[],settings:{fps:30}
});
test('correct timed words and keep original project immutable',()=>{
 const p=base(),q=repairTimedWord(p,'w1',{text:'Hello',speaker:'Speaker 2',start:20.2,end:20.8});
 assert.equal(p.words[0].text,'Hey');
 assert.equal(q.words[0].text,'Hello');
 assert.equal(q.words[0].timing,'manual-reviewed');
 assert.equal(q.words[0].speaker,'Speaker 2');
 assert.equal(reviewWordRows(q,'a').find(w=>w.id==='w1'),undefined);
 assert.throws(()=>repairTimedWord(p,'w1',{start:40,end:30}),/valid original-source/);
 assert.throws(()=>repairTimedWord(p,'w1',{start:20,end:155}),/past the original/);
});
test('split and merge only actual original timed text',()=>{
 const p=base(),split=splitTimedWord(p,'w3');
 assert.equal(split.words.filter(w=>w.assetId==='a').length,p.words.length+1);
 assert.deepEqual(split.words.slice(-2).map(w=>w.text),['Stop','now']);
 assert.equal(split.words.at(-2).end,split.words.at(-1).start);
 assert.equal(mergeTimedWord(p,'w1').words[0].text,'Hey there');
 assert.equal(mergeTimedWord(p,'w1').words.length,p.words.length-1);
 assert.throws(()=>splitTimedWord(p,'w1'),/two-word caption/);
 assert.throws(()=>mergeTimedWord(p,'w3'),/No adjacent word/);
});
test('timed transcript coverage remains labeled as metadata and escaped',()=>{
 const p=base();
 p.assets[0].name='<svg onload=alert(1)>';
 const h=transcriptReviewHTML(p,'a');
 assert.match(h,/no timed transcript|NOT evidence of silence/i);
 assert.ok(h.includes('&lt;svg')===false); // Header displays no source name.
 assert.ok(h.includes('review-word-row'));
 assert.ok(!h.includes('<svg onload='));
});
test('human event sync infers plausible clock drift with true overlap',()=>{
 const fit=fitManualPovAnchors([
  {referenceTime:10,targetTime:15.02},
  {referenceTime:100,targetTime:105.2}
 ],150,150);
 assert.ok(Math.abs(fit.scale-1.002)<.00001);
 assert.ok(Math.abs(fit.offset-5)<.1);
 assert.equal(fit.manualAnchors.length,2);
 const overlap=manualPovOverlap(fit,150,150);
 assert.ok(overlap.seconds>140);
 assert.ok(overlap.samples.length>=5);
 assert.throws(()=>fitManualPovAnchors([{referenceTime:10,targetTime:12}],150,150),/at least 10 seconds|two separate/);
 assert.throws(()=>fitManualPovAnchors([{referenceTime:0,targetTime:10},{referenceTime:100,targetTime:150}],150,200),/clock drift/);
});
test('manual sync rejects contradictory points and ungrounded duration',()=>{
 assert.throws(()=>fitManualPovAnchors([{referenceTime:0,targetTime:5},{referenceTime:60,targetTime:65},{referenceTime:90,targetTime:100}],160,170),/clock drift|disagree/);
 const p=base();p.povManualMarkers={'a|b':[{referenceTime:10,targetTime:15}]};
 assert.match(povManualSyncHTML(p,'a','b'),/1 saved human-marked pairs/);
});
test('saved versions explain source/cut/edit deltas without changing either',()=>{
 const p=base(),draft=structuredClone(p);
 draft.words[0].text='Changed';draft.settings.fps=24;draft.segments[0].start=19;
 draft.segments.push({id:'s2',assetId:'b',start:1,end:5,speed:1});draft.assets.push({id:'c',name:'test.mp4'});
 const changes=compareProjectVersions(p,draft);
 assert.deepEqual(changes.addedCuts,['s2']);
 assert.deepEqual(changes.changedCuts,['s1']);
 assert.deepEqual(changes.addedSources,['c']);
 assert.equal(changes.transcriptChanged,true);
 assert.deepEqual(changes.changedSettings,['fps']);
 assert.equal(p.segments.length,1);
 assert.equal(changes.mediaBytesCompared,false);
});
test('saved running-state view does not label paused work complete',()=>{
 const p=base();p.selectedAsset='a';const statuses=actualProcessingStates(p);
 assert.equal(statuses.find(x=>x.id==='a').status,'paused');
 assert.equal(statuses.find(x=>x.id==='b').status,'not-started');
 assert.equal(actualProcessingStates(p,{asrRunning:true}).find(x=>x.id==='a').status,'running');
 assert.ok(outboundDataDisclosure(p).some(x=>x.payload.includes('frame/contact-sheet')));
 assert.match(productionReviewHTML(p,[]),/metadata/);
});
