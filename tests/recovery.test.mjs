import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticRecoveryDue,buildAutomaticRecovery,staleAutomaticRecovery,RECOVERY_INTERVAL_MS,MAX_AUTO_RECOVERY_POINTS} from '../src/recovery.js';
import {newProject} from '../src/model.js';
const t=1700000000000;
test('first edit automatically checkpoints and future saves do not create one each second',()=>{
 const project=newProject();project.id='project-a';
 assert.equal(automaticRecoveryDue([],project.id,t),true);
 const one=buildAutomaticRecovery(project,'checkpoint-1',t);
 assert.equal(one.automatic,true);
 assert.equal(one.projectId,project.id);
 assert.equal(automaticRecoveryDue([one],project.id,t+1000),false);
 assert.equal(automaticRecoveryDue([one],project.id,t+RECOVERY_INTERVAL_MS+1),true);
 assert.equal(automaticRecoveryDue([one],'other-project',t+1000),true);
});
test('checkpoint strips source media bytes and is restorable project metadata',()=>{
 const project=newProject();project.assets=[{id:'source',name:'clip.mp4',type:'video',file:new Uint8Array(20),url:'blob:local',size:20}];
 project.segments=[{id:'clip',assetId:'source',start:0,end:12,speed:1}];
 const checkpoint=buildAutomaticRecovery(project,'v1',t);
 assert.equal(checkpoint.project.assets[0].file,undefined);
 assert.equal(checkpoint.project.assets[0].url,undefined);
 assert.equal(checkpoint.project.segments.length,1);
});
test('recovery rotation deletes oldest automatic only and never named snapshots',()=>{
 const project=newProject();project.id='x';
 const autos=Array.from({length:MAX_AUTO_RECOVERY_POINTS+4},(_,i)=>buildAutomaticRecovery(project,'auto'+i,t+i*300000));
 const named={...buildAutomaticRecovery(project,'named',t-1000000),automatic:false};
 const prune=staleAutomaticRecovery([...autos,named]);
 assert.equal(prune.length,4);
 assert(!prune.includes(named.id));
 assert.deepEqual(prune,['auto3','auto2','auto1','auto0']);
});
