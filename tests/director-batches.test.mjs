import test from 'node:test';import assert from 'node:assert/strict';
import {planDirectorBatch,directorViewCandidates,assignDirectorBatch} from '../src/director-batches.js';
const base={mode:'cod-pvp',provider:'heuristic',clipMin:20,clipMax:75};
test('changing creative directions makes a fresh batch with same source available for re-review',()=>{
 const first=planDirectorBatch({directorBatches:[],candidates:[],directorHistory:[]},{...base,directorInstructions:'ONLY funny trolling'},{id:'one'});
 const c={id:'original',segments:[{assetId:'recording',start:50,end:80}]};
 const project={directorBatches:[first.batch],directorActiveBatchId:first.batch.id,candidates:assignDirectorBatch([c],first.batch),directorHistory:[{directorBatchId:'one',assetId:'recording',start:50,end:80}]};
 const second=planDirectorBatch(project,{...base,directorInstructions:'ONLY revives and clutches'},{id:'two'});
 assert.equal(second.newBatch,true);assert.equal(second.existingCandidates.length,0);assert.equal(second.history.length,0);
 assert.equal(second.batch.id,'two');
});
test('same direction finds more without recycling earlier results',()=>{
 const options={...base,directorInstructions:'troll enemies'};
 const one=planDirectorBatch({},options,{id:'one'});
 const project={directorBatches:[one.batch],directorActiveBatchId:'one',candidates:assignDirectorBatch([{id:'a'}],one.batch),directorHistory:[{directorBatchId:'one',signature:'a'}]};
 const again=planDirectorBatch(project,options,{id:'not-used'});
 assert.equal(again.newBatch,false);assert.equal(again.existingCandidates.length,1);assert.equal(again.history.length,1);
});
test('stored old and new directions can be compared without duplicate IDs',()=>{
 const a={id:'r1',direction:'troll'},b={id:'r2',direction:'clutch'};
 const project={directorActiveBatchId:'r2',candidates:[...assignDirectorBatch([{id:'same'}],a),...assignDirectorBatch([{id:'same'}],b),{id:'legacy'}]};
 assert.equal(directorViewCandidates(project,'r1').length,1);
 assert.equal(directorViewCandidates(project,'r2').length,1);
 assert.equal(directorViewCandidates(project,'legacy').length,1);
 assert.equal(directorViewCandidates(project,'all').length,3);
 assert.notEqual(project.candidates[0].id,project.candidates[1].id);
});
