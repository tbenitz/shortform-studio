import test from 'node:test';
import assert from 'node:assert/strict';
import {extendSourceRange,completeExchangeRange,applyClipExtension,extendCandidateCut} from '../src/clip-context.js';
const base=()=>({assets:[{id:'v',type:'video',duration:180,name:'Real source.webm'}],
 segments:[{id:'one',assetId:'v',start:12,end:19,speed:1,notes:'Funny'},
           {id:'two',assetId:'v',start:36,end:44,speed:1}],
 audio:[{id:'music',start:9,duration:8},{id:'inside',start:4,duration:2}],
 markers:[{id:'setup',time:1},{id:'after',time:16}],
 words:[{assetId:'v',start:8,end:10,text:'Wait'},
        {assetId:'v',start:10.3,end:12.2,text:'I have a story'},
        {assetId:'v',start:12.4,end:14,text:'I tried to fly'},
        {assetId:'v',start:14.2,end:18,text:'It did not go well'},
        {assetId:'v',start:19.5,end:21,text:'Everybody laughed'},
        {assetId:'v',start:70,end:72,text:'Completely unrelated'}]});
test('extend either side of a real original video, clamp to source boundaries',()=>{
 const p=base(),c=p.segments[0];
 assert.deepEqual([extendSourceRange(c,p.assets,{side:'before',seconds:5}).start,extendSourceRange(c,p.assets,{side:'after',seconds:5}).end],[7,24]);
 assert.deepEqual([extendSourceRange(c,p.assets,{side:'both',seconds:100}).start,extendSourceRange(c,p.assets,{side:'both',seconds:100}).end],[0,119]);
 assert.throws(()=>extendSourceRange({...c,start:0},p.assets,{side:'before',seconds:5}),/no more footage/);
 assert.throws(()=>extendSourceRange(c,[],{side:'both',seconds:5}),/Relink/);
});
test('automatic whole-exchange range includes real setup and reaction but not a different topic 50s away',()=>{
 const p=base(),next=completeExchangeRange(p.segments[0],p.words,p.assets);
 assert.equal(next.start,6.8);
 assert.equal(next.end,22.8);
 assert.equal(next.notes,'Funny');
 assert.equal(p.segments[0].start,12);
 assert.throws(()=>completeExchangeRange(p.segments[0],[],p.assets),/No timed dialogue/);
});
test('ripple after extending left/right retains markers and audio aligned to their original timeline positions',()=>{
 const p=base(),c=p.segments[0];
 const next=extendSourceRange(c,p.assets,{side:'both',seconds:4});
 const diff=applyClipExtension(p,'one',next);
 assert.deepEqual([diff.before,diff.after,diff.addedSeconds],[4,4,8]);
 assert.deepEqual([p.segments[0].start,p.segments[0].end,p.segments[1].start],[8,23,36]);
 assert.deepEqual(p.audio.map(a=>a.start),[17,8]);
 assert.deepEqual(p.markers.map(m=>m.time),[5,24]);
 assert.equal(p.segments[0].notes,'Funny');
 assert.throws(()=>applyClipExtension(p,'one',{...next,start:9}),/shrink/);
});
test('clip speed correctly maps source seconds to output runtime and marker shifts',()=>{
 const p=base();p.segments[0].speed=2;p.markers=[{id:'after',time:4}];p.audio=[];
 const result=applyClipExtension(p,'one',extendSourceRange(p.segments[0],p.assets,{side:'after',seconds:10}));
 assert.equal(result.addedSeconds,5);
 assert.equal(p.markers[0].time,9);
 assert.equal(p.segments[0].end,29);
});
test('single cut director proposals can be extended; multi-camera sequences are protected',()=>{
 const p=base(),candidate={id:'a',segments:[p.segments[0]],duration:7,reason:'Live transcript evidence'};
 const next=extendCandidateCut(candidate,p.assets,p.words,{dialogue:true});
 assert.equal(next.segments[0].start,6.8);
 assert.equal(next.duration,16);
 assert.equal(candidate.segments[0].start,12);
 assert.throws(()=>extendCandidateCut({...candidate,segments:p.segments},p.assets,p.words),/multi-cut/);
});
