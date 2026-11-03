import test from 'node:test';import assert from 'node:assert/strict';
import {labelGameplayDialogue,gameplayPreferences,generatePvPHighlights,scoreGameplayEncounter} from '../src/gameplay-director.js';
const asset={id:'cod',name:'warzone-pvp.mp4',type:'video',duration:10800};
const word=(start,text)=>text.split(' ').map((v,i,all)=>({assetId:'cod',start:start+i*.4,end:start+(i+1)*.4,text:v,speaker:'A'}));
const tracks={cod:{status:'complete',audio:[{}],events:[{start:110,end:130,peakTime:119,score:.81},{start:3900,end:3923,peakTime:3908,score:.9},{start:7100,end:7114,peakTime:7105,score:.88}],motion:[{time:118,motion:.65},{time:3908,motion:.7},{time:7105,motion:.66}]}};
const words=[...word(105,'enemy spotted behind the house'),...word(120,'broke his plates he is down'),...word(131,'bro you are trash get wrecked haha'),...word(3895,'on me two players pushing'),...word(3909,'I am down revive me'),...word(3920,'thank you that was funny'),...word(7095,'last guy one versus three clutch'),...word(7109,'team wipe got them victory')];
test('recognizes spoken CoD callouts and trash talk',()=>{
 assert.deepEqual(labelGameplayDialogue('enemy behind us'),['spotted']);
 assert.ok(labelGameplayDialogue("I'm down revive me").includes('revive'));
 assert.ok(labelGameplayDialogue('you are trash get wrecked').includes('trash'));
 assert.deepEqual(labelGameplayDialogue('seven ways to set up a microphone'),[]);
});
test('instructions influence actual local ranking, not just remote prompt',()=>{
 const g={events:[{kind:'dialogue',tags:['trash','laugh','combat'],time:20,start:15,end:22},{kind:'audio',tags:['possible-action'],score:.8}]};
 const baseline=scoreGameplayEncounter(g,{directorInstructions:''},{status:'complete'}).score;
 const funny=scoreGameplayEncounter(g,{directorInstructions:'prioritize funny trash talk and gunfights, no dialogue only'},{status:'complete'}).score;
 assert.ok(funny>baseline);assert.equal(gameplayPreferences('show revives and clutch wins').revive,true);
});
test('keeps the gunfight and its reaction as contiguous video including setup/aftermath',()=>{
 const clips=generatePvPHighlights(words,[asset],tracks,{mode:'cod-pvp',clipMin:20,clipMax:70,clipCount:0,gameplayMinScore:30,directorInstructions:'gunfights and trash talk, include aftermath'});
 assert.ok(clips.length>=3,'Expected clips from many hours, got '+clips.length);
 assert.ok(clips.every(c=>c.segments.length===1));
 const first=clips.find(c=>c.anchorTime<200),last=clips.find(c=>c.anchorTime>7000);
 assert.ok(first?.segments[0].start<=105);assert.ok(first?.segments[0].end>=135,'must include reaction');
 assert.ok(last?.segments[0].start<7100);
});
test('unverified loud gameplay sound can generate reviewable action clip without inventing kills',()=>{
 const out=generatePvPHighlights([], [asset],tracks,{mode:'cod-pvp',clipMin:12,clipMax:60,clipCount:0,gameplayMinScore:44});
 assert.ok(out.length>=2);assert.ok(out.every(x=>x.reason.includes('unverified')));
});
test('unrelated chatter with no fight evidence does not create fake PvP highlights',()=>{
 const other=word(45,'Let us discuss my dinner and television shows');
 assert.equal(generatePvPHighlights(other,[asset],{}, {mode:'cod-pvp',clipCount:0}).length,0);
});

test('very different creative directions select different parts of the SAME recording',()=>{
 const t={cod:{status:'complete',audio:[{}],
  events:[{start:130,end:135,peakTime:132,score:.8},{start:4600,end:4610,peakTime:4605,score:.9}],
  motion:[{time:132,motion:.6},{time:4605,motion:.6}]}};
 const phrases=[
  ...word(120,'proximity chat enemy talking to us I baited him and trolled him haha'),
  ...word(131,'bro you are trash I got you haha'),
  ...word(4595,'team needs revive me he downed me'),
  ...word(4607,'I am reviving my squadmate rescue me')
 ];
 const troll=generatePvPHighlights(phrases,[asset],t,{mode:'cod-pvp',clipCount:0,clipMin:15,clipMax:55,gameplayMinScore:28,directorInstructions:'ONLY enemy proximity chat trolling and pranks'});
 const rescue=generatePvPHighlights(phrases,[asset],t,{mode:'cod-pvp',clipCount:0,clipMin:15,clipMax:55,gameplayMinScore:28,directorInstructions:'ONLY revives and rescues'});
 assert.ok(troll.length>0,'Expected a trolling clip from the spoken conversation');
 assert.ok(rescue.length>0,'Expected a separate rescue clip');
 assert.ok(troll.every(c=>c.anchorTime<1000));
 assert.ok(rescue.every(c=>c.anchorTime>4000));
 assert.notDeepEqual(troll.map(c=>c.segments[0].start),rescue.map(c=>c.segments[0].start));
});
test('no identified enemy voice means no fabricated enemy trolling results',()=>{
 const content=word(100,'shooting enemy behind me').concat(word(120,'I got him down'));
 const t={cod:{status:'complete',audio:[{}],events:[{start:105,end:114,peakTime:109,score:.9}],motion:[]}};
 const proposed=generatePvPHighlights(content,[asset],t,{mode:'cod-pvp',clipCount:0,gameplayMinScore:25,directorInstructions:'ONLY enemy proximity chat trolling'});
 assert.equal(proposed.length,0);
});

test('two transcript speakers can suggest a playful back-and-forth, without assigning them to opposing teams',()=>{
 const w=[{assetId:'cod',start:100,end:103,text:'you',speaker:'Speaker A'},{assetId:'cod',start:103,end:104,text:'trash',speaker:'Speaker A'},{assetId:'cod',start:105,end:107,text:'no',speaker:'Speaker B'},{assetId:'cod',start:107,end:109,text:'you suck',speaker:'Speaker B'}];
 const out=generatePvPHighlights(w,[asset],{}, {mode:'cod-pvp',clipCount:0,clipMin:8,clipMax:35,gameplayMinScore:25,directorInstructions:'funny trash talk'});
 assert.ok(out.length>0);
 assert.ok(out[0].gameplay.multiSpeakerExchange);
 assert.ok(!out[0].reason.includes('verified enemy'));
});
