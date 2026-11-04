import test from 'node:test';
import assert from 'node:assert/strict';
import {storyboardTimes,normalizeVision,matchRequestedEvent,editFromVision,reviewWithVision} from '../src/pov-vision.js';

const sync={referenceId:'a',targetId:'b',offset:19066.825,scale:.99975115};
const assets=[{id:'a',name:'POV A',duration:12310,type:'video'},{id:'b',name:'POV B',duration:42898,type:'video'}];
const candidate={id:'scout-1',pov:{globalStart:100,globalEnd:168},anchorTime:100,
 segments:[],mode:'multi-pov-story'};
const times=storyboardTimes(candidate);
const reviewed={frames:[
 {camera:'A',time:times[1],evidence:['muzzle_flash']},
 {camera:'B',time:times[3],evidence:['enemy_visible']},
 {camera:'A',time:times[5],evidence:['hit_marker']},
 {camera:'B',time:times[7],evidence:['damage_indicator']},
 {camera:'A',time:times[9],evidence:['enemy_visible']}
],summary:'A and B show nearby fighting'};
test('scout timestamps are data-driven and inside the encounter',()=>{
 assert.equal(times.length,12);
 assert.ok(times.every(t=>t>=100&&t<=168));
 assert.ok(times[0]<times.at(-1));
});
test('rejects unlabelled activity and false visual yes with no observed frames',()=>{
 assert.equal(normalizeVision({visibleCombat:true,frames:[]},times).usable,false);
 assert.equal(normalizeVision({frames:[
  {camera:'A',time:times[2],evidence:['enemy_visible']},
  {camera:'B',time:times[4],evidence:['enemy_visible']},
  {camera:'A',time:times[6],evidence:['enemy_visible']}
 ]},times).usable,false,'Holding a gun / walking near an enemy is not a gunfight');
});
test('requires real cited action in both camera views close in shared time',()=>{
 assert.equal(normalizeVision(reviewed,times).usable,true);
 assert.equal(normalizeVision({frames:[
  {camera:'A',time:times[0],evidence:['muzzle_flash']},
  {camera:'B',time:999999,evidence:['enemy_shooting']}
 ]},times).usable,false);
});
test('rescue requires specific down AND revive UI evidence',()=>{
 const r=normalizeVision(reviewed,times);
 assert.equal(matchRequestedEvent(r,'teammate gets downed and other teammate saves the day'),false);
 assert.equal(matchRequestedEvent(r,'show a gunfight with two POVs'),true);
});
test('builds fresh cuts from actual cited frames at original source timestamps',()=>{
 const review=normalizeVision(reviewed,times);
 const edit=editFromVision(candidate,review,sync,assets);
 assert.ok(edit);
 assert.equal(edit.pov.visionVerified,true);
 assert.notEqual(edit.id,candidate.id);
 assert.ok(edit.segments.length>=3);
 assert.equal(new Set(edit.segments.map(s=>s.assetId)).size,2);
 for(const seg of edit.segments){
  assert.ok(seg.end>seg.start);
  if(seg.assetId==='b'){
   assert.ok(seg.start>19000);
   assert.ok(Math.abs(seg.speed-sync.scale)<.000001);
  }
 }
 for(let i=1;i<edit.segments.length;i++){
  assert.ok(Math.abs(edit.segments[i].storyGlobalStart-edit.segments[i-1].storyGlobalEnd)<.001,'No jumps into unrelated video time');
 }
});
test('visual review sends real image parts, uses deepseek-flash, never falls back to local cuts',async()=>{
 let got;
 const fakeCapture=async()=> 'data:image/jpeg;base64,ZmFrZQ==';
 const fetcher=async(url,opts)=>{
  got=JSON.parse(opts.body);
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(reviewed)}}]})};
 };
 const answer=await reviewWithVision(candidate,{sync,assets,
  files:{a:{},b:{}},key:'fake-private-test-key',brief:'gunfight',
  capture:fakeCapture,fetcher});
 assert.equal(got.model,'deepseek-flash');
 assert.equal(got.messages[0].content.filter(x=>x.type==='image_url').length,2);
 assert.equal(answer.accepted,true);
 assert.equal(answer.candidate.pov.visionVerified,true);
});
test('malformed vision response is an error, NOT a keyword-only fallback',async()=>{
 await assert.rejects(reviewWithVision(candidate,{sync,assets,files:{a:{},b:{}},key:'test',
  capture:async()=> 'data:image/jpeg;base64,ZmFrZQ==',
  fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:'nonsense'}}]})})}),/malformed/i);
});
