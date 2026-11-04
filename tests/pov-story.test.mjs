import test from 'node:test';import assert from 'node:assert/strict';
import {groupStoryEncounters,storyMoments,composePovStory,buildMultiPovStories} from '../src/pov-story.js';
import {alignedPovEvents} from '../src/pov-director.js';
const sync={referenceId:'a',targetId:'b',offset:-4,scale:1,confidence:'medium'};
const assets=[{id:'a',name:'Shooter A',type:'video',duration:1200},{id:'b',name:'Shooter B',type:'video',duration:1200}];
const tracks={
 a:{status:'complete',audio:[{}],events:[{start:102,end:109,peakTime:105,score:.9},{start:123,end:132,peakTime:127,score:.5},{start:160,end:166,peakTime:163,score:.8}],motion:[{time:105,motion:.9},{time:127,motion:.5}]},
 b:{status:'complete',audio:[{}],events:[{start:99,end:107,peakTime:101,score:.4},{start:119,end:127,peakTime:124,score:.94},{start:155,end:164,peakTime:159,score:.88}],motion:[{time:124,motion:.96},{time:159,motion:.9}]}
};
const w=(id,t,text)=>text.split(' ').map((token,i)=>({assetId:id,start:t+i*.25,end:t+(i+1)*.25,text:token,speaker:'player'}));
const words=[...w('a',94,'enemy spotted over here behind me'),...w('a',136,'i am down revive me'),...w('a',170,'bro that was hilarious'),
 ...w('b',119,'i got him down what a fight'),...w('b',156,'squad wipe what a clutch')];
test('collects separated story moments, no three-hour unrelated encounters',()=>{
 const events=alignedPovEvents(words,tracks,sync),groups=groupStoryEncounters(events);
 assert.ok(groups.length>=1);assert.ok(storyMoments(groups[0]).length>=4);
});
test('generates genuine A+B montage with non-contiguous source ranges and named narrative beats',()=>{
 const candidates=buildMultiPovStories(words,assets,tracks,sync,{clipMin:25,clipMax:80,clipCount:0});
 assert.ok(candidates.length>0,'Expected story output from several fight stages');
 const c=candidates[0];
 assert.equal(c.mode,'multi-pov-story');
 assert.ok(c.segments.length>=4,'Must be multiple different parts, not a single source link');
 assert.equal(new Set(c.segments.map(s=>s.assetId)).size,2,'Must actually use both video sources');
 assert.ok(c.pov.povSwitches>=1,'Must really switch between cameras, not add filler');
 assert.ok(c.pov.storyBeats[0].role.includes('Hook'));
 assert.ok(c.pov.storyBeats.at(-1).role.includes('Payoff')||c.pov.storyBeats.at(-1).role.includes('Reaction'));
 assert.ok(c.segments.some(s=>s.title.includes('POV A')));
 assert.ok(c.segments.some(s=>s.title.includes('POV B')));
 assert.ok(c.reason.includes('NOT visually confirmed'));
 assert.ok(c.pov.actionEvidencePairs>=2);
 assert.ok(c.pov.storyBeats.every((beat,i,arr)=>i===0||beat.sharedStart>=arr[i-1].sharedEnd), 'Cut clock cannot go backwards');
});
test('one-POV action does NOT fabricate an unrelated second camera cut',()=>{
 const onlyA={a:tracks.a,b:{status:'complete',audio:[{}],events:[],motion:[]}};
 const stories=buildMultiPovStories(words.filter(x=>x.assetId==='a'),assets,onlyA,sync,{clipMin:20,clipMax:80});
 assert.deepEqual(stories,[],'A silent, inactive POV B is not a legitimate second angle');
});
test('rejects one isolated conversation as an edited highlight story',()=>{
 const wds=w('a',10,'enemy behind me');
 const res=buildMultiPovStories(wds,assets,{},sync,{clipMin:20,clipMax:60});
 assert.deepEqual(res,[]);
});
test('synchronization with clock drift preserves valid B source timestamps',()=>{
 const drift={...sync,offset:-4,scale:1.0002};
 const stories=buildMultiPovStories(words,assets,tracks,drift,{clipMin:20,clipMax:80});
 assert.ok(stories.length);
 const b=stories[0].segments.filter(s=>s.assetId==='b');
 assert.ok(b.every(s=>Math.abs(s.speed-drift.scale)<1e-8));
 assert.ok(b.every(s=>s.end>s.start));
});

test('story selection honors wildly different creative directions instead of recycling same montage',()=>{
 const material=[...words,...w('a',400,'enemy spotted we are pushing'),...w('b',426,'bro you are trash haha'),
  ...w('a',640,'i am down revive me'),...w('b',665,'my squadmate needs rescue')];
 const more={
  a:{status:'complete',audio:[{}],events:[...tracks.a.events,{start:401,end:411,peakTime:405,score:.9},{start:648,end:653,peakTime:650,score:.9}],motion:[...tracks.a.motion,{time:405,motion:.8},{time:650,motion:.8}]},
  b:{status:'complete',audio:[{}],events:[...tracks.b.events,{start:399,end:410,peakTime:406,score:.8},{start:630,end:660,peakTime:652,score:.9}],motion:[...tracks.b.motion,{time:406,motion:.9},{time:652,motion:.9}]}
 };
 const fights=buildMultiPovStories(material,assets,more,sync,{storyEditorialDirection:'ONLY gunfights and combat',clipMin:20,clipMax:80});
 const revive=buildMultiPovStories(material,assets,more,sync,{storyEditorialDirection:'ONLY revives and rescues',clipMin:20,clipMax:80});
 assert.ok(fights.length>0&&revive.length>0);
 assert.ok(fights.some(s=>s.anchorTime<200));
 assert.ok(revive.every(s=>s.pov.directionMatch.matches.includes('revive')));
 assert.notDeepEqual(fights.map(s=>s.anchorTime),revive.map(s=>s.anchorTime));
});

test('rejects random transcript rescue claims without ordered down then save evidence',()=>{
 const fake=[...words.filter(w=>w.start<134),...w('a',120,'he is down')];
 const stories=buildMultiPovStories(fake,assets,tracks,sync,{storyEditorialDirection:'show fights where a teammate downs an enemy, gets downed and the other teammate saves the day',clipMin:20,clipMax:80});
 assert.deepEqual(stories,[],'Words about a down cannot invent a rescue by a teammate');
});
test('rejects motionless dialogue and sound from synchronized recordings',()=>{
 const quiet={a:{...tracks.a,motion:[]},b:{...tracks.b,motion:[]}};
 assert.deepEqual(buildMultiPovStories(words,assets,quiet,sync,{clipMin:20,clipMax:80}),[]);
});
