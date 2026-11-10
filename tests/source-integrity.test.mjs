import test from 'node:test';
import assert from 'node:assert/strict';
import {sampledMediaFingerprint,compareMediaIdentity,inspectProjectSources,MEDIA_IDENTITY_KIND} from '../src/source-integrity.js';

test('bounded source fingerprint matches same bytes but refuses different same-size video',async()=>{
 const a=new Blob(['A'.repeat(200000),'B'.repeat(600000),'C'.repeat(200000)]);
 const b=new Blob(['A'.repeat(200000),'Z'.repeat(600000),'C'.repeat(200000)]);
 const id=await sampledMediaFingerprint(a),same=await sampledMediaFingerprint(a),changed=await sampledMediaFingerprint(b);
 assert.equal(id.kind,MEDIA_IDENTITY_KIND);
 assert.equal(id.size,a.size);
 assert.equal(id.digest,same.digest);
 assert.equal(compareMediaIdentity(id,same).status,'match');
 assert.equal(compareMediaIdentity(id,changed).status,'mismatch');
 assert.equal(compareMediaIdentity(null,id).status,'unverified');
});
test('long recordings hash at most four bounded samples and never decode full source',async()=>{
 let requested=0,calls=0;
 const huge={size:2**39,slice(start,end){requested+=end-start;calls++;return new Blob([new Uint8Array(end-start).fill(start%131)])}};
 const hash=await sampledMediaFingerprint(huge);
 assert.equal(hash.size,huge.size);
 assert(calls<=4);
 assert(requested<=4*256*1024,'unexpected full media read '+requested);
});
test('connected sources are checked independently and missing/unverified sources are reported',async()=>{
 const file=new Blob(['testing source']);
 const id=await sampledMediaFingerprint(file);
 const project={assets:[{id:'a',name:'available.mp4',sourceFingerprint:id},{id:'b',name:'missing.mp4'},{id:'c',name:'unverified.mp4'}]};
 const report=await inspectProjectSources(project,async key=>key==='b'?null:file);
 assert.equal(report.total,3);
 assert.equal(report.matched,1);
 assert.equal(report.missing,1);
 assert.equal(report.unverified,1);
 assert.deepEqual(report.sources.map(x=>x.status),['match','missing','unverified']);
});
