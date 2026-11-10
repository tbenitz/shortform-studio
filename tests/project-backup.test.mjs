import test from 'node:test';
import assert from 'node:assert/strict';
import {makeVerifiedBackup,readProjectBackup,cleanProjectForBackup,PROJECT_BACKUP_FORMAT} from '../src/project-backup.js';
import {newProject} from '../src/model.js';
test('backup cryptographically verifies exact project metadata and refuses corruption',async()=>{
 const p=newProject();p.name='Verified project';p.assets=[{id:'source1',name:'movie.mp4',size:400,sourceFingerprint:{digest:'fake'},url:'blob:secret',file:new Blob(['not included'])}];
 const backup=await makeVerifiedBackup(p);
 assert.equal(backup.format,PROJECT_BACKUP_FORMAT);
 assert.equal(backup.mediaIncluded,false);
 assert.equal(backup.project.assets[0].file,undefined);
 assert.equal(backup.project.assets[0].url,undefined);
 const loaded=await readProjectBackup(JSON.stringify(backup));
 assert.equal(loaded.verified,true);
 assert.equal(loaded.project.name,'Verified project');
 const damaged=structuredClone(backup);damaged.project.name='Tampered';
 await assert.rejects(()=>readProjectBackup(damaged),/integrity check FAILED/);
});
test('a plain legacy project is accepted only by legacy import, never the verified-restore control',async()=>{
 const p=newProject();
 await assert.rejects(()=>readProjectBackup(JSON.stringify(p)),/unverified older project/);
 const legacy=await readProjectBackup(JSON.stringify(p),{acceptLegacy:true});
 assert.equal(legacy.verified,false);
 assert.equal(legacy.project.id,p.id);
});
test('clean metadata excludes top-level credential fields',()=>{
 const p=newProject();p.apiKey='forbidden';p.providerKey='forbidden';p.assets=[{id:'a',name:'src.mp4',file:new Blob(['x']),url:'blob:test'}];
 const clean=cleanProjectForBackup(p);
 assert(!JSON.stringify(clean).includes('forbidden'));
 assert.equal(clean.assets[0].url,undefined);
});
