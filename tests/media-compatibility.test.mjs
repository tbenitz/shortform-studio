import test from 'node:test';
import assert from 'node:assert/strict';
import {guessSourceContainer,inspectSourceDecode,mediaCompatibilityHTML,SUPPORTED_CONTAINERS} from '../src/media-compatibility.js';

test('identifies supported containers from bounded real header bytes',()=>{
 const mp4=new Uint8Array(64);mp4.set(new TextEncoder().encode('ftyp'),4);
 const r=guessSourceContainer('my.mp4',mp4);
 assert.equal(r.headerFamily,'ISO BMFF / QuickTime family');
 assert.equal(r.codecVerified,false);
 const webm=new Uint8Array([0x1a,0x45,0xdf,0xa3,0x01]);
 assert.match(guessSourceContainer('rec.mkv',webm).headerFamily,/EBML/);
 const riff=new Uint8Array(32);riff.set(new TextEncoder().encode('RIFF'),0);riff.set(new TextEncoder().encode('AVI '),8);
 assert.equal(guessSourceContainer('rec.avi',riff).headerFamily,'AVI');
 assert.deepEqual(SUPPORTED_CONTAINERS,['mp4','m4v','mov','mkv','webm','avi','ts']);
});
test('file extension does not imply actual Chrome codec support',()=>{
 const r=guessSourceContainer('record.ts',new Uint8Array(30));
 assert.equal(r.extensionRecognized,true);
 assert.equal(r.codecVerified,false);
 assert.match(r.conclusion,/No reliable/);
 assert.equal(guessSourceContainer('fake.mp4',new Uint8Array(12)).headerFamily,'unknown');
});
test('no browser decoder means explicitly unavailable, not falsely verified',async()=>{
 const file={name:'test.mp4',size:64,slice(){return new Blob([new Uint8Array(64)])}};
 const report=await inspectSourceDecode(file);
 assert.equal(report.status,'unavailable');
 assert.equal(report.header.codecVerified,false);
});
test('HTML is escaped and visible decoder report is not a false export-success claim',()=>{
 const h=mediaCompatibilityHTML({name:'<img>',type:'video',
  sourceDecodeReport:{status:'sampled-decoder-ready',samples:[1,2],note:'Only two original frames were decoded'}});
 assert.ok(h.includes('Original')||h.includes('original'));
 assert.ok(h.includes('2 decoded frames'));
 assert.ok(!h.includes('<img>'));
});
