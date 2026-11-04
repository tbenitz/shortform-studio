import test from 'node:test';import assert from 'node:assert/strict';
import {interpretStoryBrief,parseScoutingWindows,selectEditorialStories} from '../src/story-brief.js';
const elaborate=[
'# AI DIRECTOR — MULTI-POV CALL OF DUTY STORY EDITOR',
'Your assignment is to analyze both recordings and their complete transcripts, then create at least FIVE genuinely entertaining, coherent, multi-POV shorts.',
'PRIMARY OBJECTIVE: include action, gunfights, downs, revives, trolling and reactions.',
'STRICT QUALITY CONTROL: reject disconnected random moments; never invent enemies; no unrelated conversations or stream introductions.',
'1. Gas station/hospital fight: POV A 00:33:35–00:37:30; POV B 05:51:21–05:55:16.',
'2. Vehicle chase: POV A 00:38:35–00:41:15; POV B 05:56:21–05:59:01.',
'3. Indoor fight: POV A 01:49:05–01:55:00; POV B 07:06:50–07:12:45.',
'4. LTV fight: POV A 02:55:40–02:59:20; POV B 08:13:24–08:17:04.',
'5. Third party fight: POV A 03:16:35–03:18:40; POV B 08:34:18–08:36:23.',
'Do not cut the gunplay. Actual engagements can be longer than arbitrary segments.'
].join('\n');
test('interprets the user 5-story detailed prompt as an editorial brief rather than impossible hard filters',()=>{
 const brief=interpretStoryBrief(elaborate);
 assert.equal(brief.longForm,true);
 assert.equal(brief.targetCount,5);
 assert.equal(brief.windows.length,5);
 assert.equal(brief.windows[0].start,2015);
 assert.equal(brief.windows[0].targetStart,21081);
});
test('simple creative topic can still be used as a short topic query',()=>{
 const brief=interpretStoryBrief('ONLY revives and rescues');
 assert.equal(brief.longForm,false);
 assert.equal(brief.windows.length,0);
});
test('selects up to five DISTINCT narrative stories across supplied encounter windows',()=>{
 const brief=interpretStoryBrief(elaborate);
 const starts=[2100,2320,6580,10520,11810,7000,2195];
 const stories=starts.map((start,i)=>({
  id:'story'+i,mode:'multi-pov-story',anchorTime:start,
  segments:[{assetId:'a'},{assetId:'b'},{assetId:'a'}],
  pov:{globalStart:start,globalEnd:start+60,jumpCuts:2,storyBeats:[
   {role:'Hook / setup'},{role:'Engagement / combat audio'},
   {role:'Down / elimination callout'},{role:'Reaction / trash talk'}
  ]},score:99,reason:'Draft story'
 }));
 const selected=selectEditorialStories(stories,brief);
 assert.ok(selected.length>=5,JSON.stringify(selected.map(c=>c.anchorTime)));
 assert.equal(selected.length,5);
 assert.ok(selected.every(c=>c.score<99),'Scores must no longer be artificially all 99');
 assert.ok(new Set(selected.map(c=>c.id)).size===5);
});
test('does not fabricate a fifth story if only two supported stories exist',()=>{
 const p=interpretStoryBrief('Create at least five good multi-POV stories');
 const a={id:'one',anchorTime:10,segments:[{assetId:'a'},{assetId:'b'},{assetId:'a'}],pov:{jumpCuts:2,storyBeats:[{role:'Hook'},{role:'Combat'},{role:'Payoff'}]}};
 assert.equal(selectEditorialStories([a,{...a,id:'two',anchorTime:300}],p).length,2);
});
