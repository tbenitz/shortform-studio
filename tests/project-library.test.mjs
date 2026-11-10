import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject} from '../src/model.js';
import {makeLibraryProject,cloneLibraryProject,filterLibraryProjects} from '../src/project-library.js';
test('named project versions preserve source IDs and non-destructive edits',()=>{
 const p=newProject();p.name='Funny DMZ Stories';p.assets=[{id:'source-shared',name:'match.mp4',type:'video',size:900,sourceFingerprint:{kind:'test',size:900,digest:'abc'},url:'blob:original'}];
 p.segments=[{id:'clip1',assetId:'source-shared',start:5,end:31,speed:1}];
 const saved=makeLibraryProject(p,{now:1000});
 const duplicate=cloneLibraryProject(saved,{now:2000,id:'copy1'});
 assert.equal(duplicate.name,'Funny DMZ Stories (copy)');
 assert.equal(duplicate.id,'copy1');
 assert.equal(duplicate.project.assets[0].id,'source-shared');
 assert.equal(duplicate.project.assets[0].sourceFingerprint.digest,'abc');
 assert.equal(duplicate.project.assets[0].url,undefined);
 assert.equal(saved.project.segments[0].start,5);
 assert.equal(p.assets[0].url,'blob:original');
});
test('search includes project name or original source filename while archive remains opt-in',()=>{
 const p=newProject();p.name='Pilot';p.assets=[{id:'a',name:'Helicopter Match.mp4'}];
 const one=makeLibraryProject(p,{now:100});
 const archived={...one,id:'archived',archived:true,name:'Old story',updatedAt:200};
 assert.equal(filterLibraryProjects([one,archived],'helicopter').length,1);
 assert.equal(filterLibraryProjects([one,archived],'old').length,0);
 assert.equal(filterLibraryProjects([one,archived],'old',true).length,1);
});
