import test from 'node:test';import assert from 'node:assert/strict';
import {directorOutputMode,visibleDirectorCandidates,directorResultCounts,isAssembledPovStory,usableAutoSync} from '../src/director-mode.js';
const raw={id:'old',mode:'cod-pvp',directorBatchId:'raw1',segments:[{assetId:'a',start:0,end:20}]};
const story={id:'new',mode:'multi-pov-story',directorBatchId:'story1',segments:[{assetId:'a',start:0,end:5},{assetId:'b',start:10,end:15},{assetId:'a',start:20,end:25}],pov:{jumpCuts:2,visionVerified:true}};
const project={assets:[{id:'a',type:'video'},{id:'b',type:'video'}],
 candidates:[raw,story],directorBatches:[{id:'raw1',mode:'cod-pvp'},{id:'story1',mode:'multi-pov-story'}],
 directorActiveBatchId:'raw1'};
test('two video sources default to composite multi-POV stories rather than raw singles',()=>{
 assert.equal(directorOutputMode(project),'stories');
 assert.equal(directorOutputMode(project,'raw'),'raw');
 assert.equal(directorOutputMode({assets:[{type:'video'}]}),'raw');
});
test('active story view hides 500 old raw one-cut results even if previous active batch was raw',()=>{
 const legacy=Array.from({length:500},(_,i)=>({...raw,id:'old'+i}));
 const p={...project,candidates:[...legacy,story]};
 assert.deepEqual(visibleDirectorCandidates(p,'stories','active').map(c=>c.id),['new']);
 assert.equal(directorResultCounts(p).raw,500);
 assert.deepEqual(visibleDirectorCandidates(p,'stories','raw').length,500);
});
test('no completed stories shows zero results instead of falsely displaying raw proposals',()=>{
 const p={...project,candidates:[raw]};
 assert.deepEqual(visibleDirectorCandidates(p,'stories','active'),[]);
 assert.equal(directorResultCounts(p).stories,0);
});
test('one-source or one-cut objects are never labeled two-POV stories',()=>{
 assert.equal(isAssembledPovStory({...story,segments:[story.segments[0]]}),false);
 assert.equal(isAssembledPovStory(story),true);
});
test('automatic synchronization requires credible shared-speech anchors',()=>{
 assert.equal(usableAutoSync({status:'matched',offset:1234,scale:1,inliers:8,confidence:'high'}),true);
 assert.equal(usableAutoSync({status:'matched',offset:0,scale:1,inliers:3,confidence:'low'}),false);
 assert.equal(usableAutoSync({status:'insufficient',offset:0,scale:1,inliers:0,confidence:'high'}),false);
});

test('old unverified multi-POV montages disappear from every view without deleting project data',()=>{
 const obsolete={...story,id:'obsolete',pov:{jumpCuts:6}};
 const p={...project,candidates:[raw,obsolete,story]};
 assert.deepEqual(visibleDirectorCandidates(p,'stories','all').map(c=>c.id),['old','new']);
 assert.deepEqual(visibleDirectorCandidates(p,'stories','active').map(c=>c.id),['new']);
 assert.equal(directorResultCounts(p).stories,1);
 assert.equal(directorResultCounts(p).raw,1);
 assert.equal(p.candidates.length,3,'Archived cards remain in saved project but cannot show up as stories');
});
