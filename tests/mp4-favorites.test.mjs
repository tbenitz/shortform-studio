import test from 'node:test';
import assert from 'node:assert/strict';
import {isMp4Buffer,loadMp4Sdk,MP4_SDK_SOURCES} from '../src/mp4-export.js';
import {newProject,makeSegment,validateProject} from '../src/model.js';

test('MP4 validation requires ISO ftyp, never accepts WebM renamed to MP4',()=>{
 const valid=new Uint8Array(48);valid.set([0,0,0,48,102,116,121,112,105,115,111,109],0);
 assert.equal(isMp4Buffer(valid),true);
 const fakeWebm=new Uint8Array(48);fakeWebm.set([0x1a,0x45,0xdf,0xa3],0);
 assert.equal(isMp4Buffer(fakeWebm),false);
 assert.equal(isMp4Buffer(new Uint8Array(10)),false);
});
test('favorites persist in project validation for source files, edited clips and Director proposals',()=>{
 const project=newProject();
 project.assets=[{id:'src',name:'source.mp4',type:'video',size:200,duration:10,favorite:true}];
 project.segments=[{...makeSegment('src',0,5),favorite:true}];
 project.candidates=[{id:'candidate',title:'Favorite',favorite:true,segments:[makeSegment('src',0,3)]}];
 const loaded=validateProject(JSON.parse(JSON.stringify(project)));
 assert.equal(loaded.assets[0].favorite,true);
 assert.equal(loaded.segments[0].favorite,true);
 assert.equal(loaded.candidates[0].favorite,true);
});

test('MP4 loader recovers from missing Pages local vendor and uses pinned backup without changing format',async()=>{
 const tries=[],stub={Output:()=>{},Mp4OutputFormat:()=>{},BufferTarget:()=>{},MediaStreamVideoTrackSource:()=>{},MediaStreamAudioTrackSource:()=>{}};
 const got=await loadMp4Sdk(async url=>{tries.push(url);if(tries.length===1)throw Error('404 HTML Pages branch without vendor');return stub});
 assert.equal(got,stub);
 assert.equal(tries.length,2);
 assert.equal(tries[0],MP4_SDK_SOURCES[0]);
 assert.match(tries[1],/mediabunny@1\.65\.0/);
});
