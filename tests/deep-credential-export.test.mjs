import test from 'node:test';
import assert from 'node:assert/strict';
import {stripCredentialFields,cleanProjectForBackup,makeVerifiedBackup,readProjectBackup} from '../src/project-backup.js';
test('portable backups scrub nested credential keys without touching actual dialogue',async()=>{
 const source={id:'x',name:'My film',assets:[{id:'v',name:'film.mp4',file:{a:1},size:42,apiKey:'asset-secret'}],
  segments:[{id:'s',assetId:'v',start:0,end:5,notes:'A character literally says API key in their speech'}],
  words:[{id:'w',assetId:'v',start:0,end:1,text:'my private key is a line in a screenplay'}],
  audio:[],settings:{accessToken:'top-secret',providerUrl:'https://example.org',nested:{api_key:'nested-secret'}},
  metadata:{nested:[{authorization:'Bearer secret',title:'Original dialogue'}]}};
 const out=cleanProjectForBackup(source);
 const text=JSON.stringify(out);
 assert.ok(!text.includes('asset-secret')&&!text.includes('top-secret')&&!text.includes('nested-secret')&&!text.includes('Bearer secret'));
 assert.ok(text.includes('Original dialogue'));
 assert.ok(text.includes('private key is a line'));
 assert.equal(out.settings.providerUrl,'https://example.org');
 assert.equal(source.settings.accessToken,'top-secret');
 const bundle=await makeVerifiedBackup(source);
 assert.equal((await readProjectBackup(bundle)).verified,true);
});
test('circular metadata fails closed instead of silently exporting broken JSON',()=>{
 const cyclic={};cyclic.loop=cyclic;
 assert.throws(()=>stripCredentialFields(cyclic),/circular/);
});
test('ordinary numeric project settings and timeline metadata remain unchanged',()=>{
 const value={settings:{fps:30,captionSize:42},segments:[{id:'a',start:10,end:30}],password:'secret'};
 const safe=stripCredentialFields(value);
 assert.equal(safe.settings.fps,30);
 assert.equal(safe.segments[0].start,10);
 assert.equal(safe.password,undefined);
});
