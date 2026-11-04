import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverVisionScouts,chooseFreshVisionScouts} from '../src/pov-scout.js';
const assets=[{id:'a',type:'video',duration:3600},{id:'b',type:'video',duration:4600}];
const sync={referenceId:'a',targetId:'b',offset:1000,scale:1};
const events=(times,offset)=>times.map(t=>({start:t+offset,end:t+offset+7,peakTime:t+offset+3,score:.8}));
const tracks={
 a:{status:'complete',audio:[{}],events:events([120,1120,2280],0),motion:[]},
 b:{status:'complete',audio:[{}],events:events([120,1120,2280],1000),motion:[]}
};
test('discovers many independent encounters across the ENTIRE overlapping source clock',()=>{
 const scouts=discoverVisionScouts([],assets,tracks,sync,{direction:'find gunfights'});
 assert.equal(scouts.length,3);
 assert.ok(scouts.some(x=>x.anchorTime<150));
 assert.ok(scouts.some(x=>x.anchorTime>2200));
 assert.ok(scouts.every(x=>x.segments.length===0),'Scouting does NOT fabricate finished editing cuts');
 assert.ok(scouts.every(x=>x.scouting.sourceViews===2));
});
test('shuffles selection across actual hours without hardcoded source timestamps',()=>{
 const scouts=discoverVisionScouts([],assets,tracks,sync,{});
 const picked=chooseFreshVisionScouts(scouts,{limit:3});
 assert.equal(picked.length,3);
 assert.equal(new Set(picked.map(x=>Math.floor(x.anchorTime/900))).size,3);
});
test('previous visual reviews cannot be recycled into the same generated batch',()=>{
 const scouts=discoverVisionScouts([],assets,tracks,sync,{});
 const first=scouts.find(x=>x.anchorTime<150);
 const next=chooseFreshVisionScouts(scouts,{limit:10,previousTimes:[first.anchorTime]});
 assert.equal(next.length,2);
 assert.ok(next.every(x=>Math.abs(x.anchorTime-first.anchorTime)>65));
});
test('never presents pure dialogue as an actual fight scouting interval',()=>{
 assert.deepEqual(discoverVisionScouts([{assetId:'a',start:100,end:101,text:'he got me down'}],assets,{},sync,{}),[]);
});
