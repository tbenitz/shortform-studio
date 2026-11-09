import test from 'node:test';
import assert from 'node:assert/strict';
import {findConnectedFunnyStories,storyMoments,storyTopicWords} from '../src/humor-stories.js';
const M=(id,assetId,start,end,dialogue)=>({id,assetId,start,end,dialogue,score:70});
test('topic parsing removes generic laughter and keeps actual scene subjects',()=>{
 const words=storyTopicWords('Bro hahaha hilarious! The helicopter crashed into another helicopter by the building');
 assert(words.includes('helicopter'));
 assert(words.includes('crash'));
 assert(!words.includes('hahaha'));
});
test('group only separate related source clips in chronological order',()=>{
 const jokes=[
  M('a','V',2,8,'Our helicopter crashed into that building.'),
  M('b','V',19,25,'The helicopter pilot crashed into that building again!'),
  M('c','V',39,43,'The enemy team found new weapons and ammunition!'),
  M('d','W',45,52,'Our helicopter crashed into that building too!')
 ];
 const stories=findConnectedFunnyStories(jokes);
 assert(stories.length>=1);
 const first=stories.find(x=>x.momentIds.includes('a'));
 assert.deepEqual(first.momentIds,['a','b']);
 assert(!first.momentIds.includes('c'));
 assert(!first.momentIds.includes('d'));
 assert.match(first.topic,/helicopter|building|crash/);
 assert.equal(storyMoments(first,jokes).length,2);
});
test('never treat a single laugh or near-duplicate overlapping clip as a multi-cut story',()=>{
 const jokes=[M('a','V',1,8,'No way that was hilarious lol!'),M('b','V',2,7,'No way that was hilarious lol!')];
 assert.equal(findConnectedFunnyStories(jokes).length,0);
});
test('reject story with unrelated footage or overlapping clips',()=>{
 const jokes=[M('a','V',1,4,'helicopter building'),M('b','X',8,11,'helicopter building')];
 assert.throws(()=>storyMoments({momentIds:['a','b']},jokes),/unsynchronized/);
});

test('natural funny storyline can include more than 6 related cuts over more than 9 minutes',()=>{
 const clips=Array.from({length:9},(_,i)=>M('topic-'+i,'V',i*280,i*280+9,'The helicopter crashed against the building and everyone laughed'));
 const found=findConnectedFunnyStories(clips);
 assert(found.length>=1);
 assert.equal(found[0].momentIds.length,9);
 assert(found[0].end-found[0].start>540);
 assert.equal(storyMoments(found[0],clips).length,9);
});
