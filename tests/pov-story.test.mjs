import test from 'node:test';import assert from 'node:assert/strict';
import {groupStoryEncounters,storyMoments,composePovStory,buildMultiPovStories} from '../src/pov-story.js';
import {alignedPovEvents} from '../src/pov-director.js';
const sync={referenceId:'a',targetId:'b',offset:-4,scale:1,confidence:'medium'};
const assets=[{id:'a',name:'Shooter A',type:'video',duration:1200},{id:'b',name:'Shooter B',type:'video',duration:1200}];
const tracks={
 a:{audio:[{}],events:[{start:102,end:109,peakTime:105,score:.9},{start:123,end:132,peakTime:127,score:.5},{start:160,end:166,peakTime:163,score:.8}],motion:[{time:105,motion:.9},{time:127,motion:.5}]},
 b:{audio:[{}],events:[{start:99,end:107,peakTime:101,score:.4},{start:119,end:127,peakTime:124,score:.94},{start:155,end:164,peakTime:159,score:.88}],motion:[{time:124,motion:.96},{time:159,motion:.9}]}
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
 assert.ok(c.pov.jumpCuts>=1,'Must trim out dead space instead of remaining continuous');
 assert.ok(c.pov.storyBeats[0].role.includes('Hook'));
 assert.ok(c.pov.storyBeats.at(-1).role.includes('Payoff')||c.pov.storyBeats.at(-1).role.includes('Reaction'));
 assert.ok(c.segments.some(s=>s.title.includes('POV A')));
 assert.ok(c.segments.some(s=>s.title.includes('POV B')));
 assert.ok(c.reason.includes('NOT visually confirmed'));
});
test('strong one-POV action still gets an accurately labeled alternate synchronized camera angle',()=>{
 const onlyA={a:tracks.a,b:{audio:[{}],events:[],motion:[]}};
 const stories=buildMultiPovStories(words.filter(x=>x.assetId==='a'),assets,onlyA,sync,{clipMin:20,clipMax:80});
 assert.ok(stories.length>0);
 assert.equal(new Set(stories[0].segments.map(s=>s.assetId)).size,2);
 assert.ok(stories[0].segments.some(s=>s.title.includes('context only')),'Unverified alternate angle must be labeled');
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
