import test from 'node:test';
import assert from 'node:assert/strict';
import {addHumorRejection,restoreHumorRejection,rejectedMatch,viewableHumorMoments,humorEvidence,humorReviewCounts} from '../src/humor-review.js';
import {newProject,validateProject} from '../src/model.js';
const first={id:'humor:a:10',assetId:'a',start:10,end:19,dialogue:'Dude that is hilarious!',source:'transcript',score:73};
const second={id:'humor:a:31',assetId:'a',start:31,end:36,dialogue:'No way, are you serious?',source:'AI-selected verified transcript',score:75};
test('owner can reject bad transcript suggestion while preserving it for later restore',()=>{
 const p=newProject();p.humorMoments=[first,second];p.compilationOrder=[first.id,second.id];
 addHumorRejection(p,first);
 assert.equal(p.compilationOrder.includes(first.id),false);
 assert.deepEqual(viewableHumorMoments(p).map(x=>x.id),[second.id]);
 assert.equal(humorReviewCounts(p).rejected,1);
 assert(rejectedMatch({...first,id:'different',start:11,end:18.6},p.humorRejected),'Repeated suggestion from AI should stay hidden');
 assert(!rejectedMatch(second,p.humorRejected));
 const saved=validateProject(structuredClone(p));
 assert.equal(saved.humorRejected.length,1);
 assert.equal(restoreHumorRejection(saved,first.id),1);
 assert.deepEqual(viewableHumorMoments(saved).map(x=>x.id),[first.id,second.id]);
});
test('rejecting same original clip twice does not add duplicate ratings',()=>{
 const p=newProject();addHumorRejection(p,first);addHumorRejection(p,first);
 assert.equal(p.humorRejected.length,1);
});
test('evidence is honest about source timestamps and cannot claim AI saw frames',()=>{
 const ev=humorEvidence(second,{name:'real-vod.mp4',url:'blob:real-video'});
 assert.equal(ev.sourceName,'real-vod.mp4');
 assert.equal(ev.mediaReady,true);
 assert.match(ev.warning,/not watched or listened/i);
});
