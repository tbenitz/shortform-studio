import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewClipStructure,orderClipSuggestions,suggestDiverseSelection} from '../src/clip-selection.js';
import {nextStep,studioGuideHTML} from '../src/studio-guide.js';
const w=(text,start,speaker='Player A',assetId='v')=>({text,start,end:start+.4,speaker,assetId});
const words=[
 w('Why',1),w('crash',1.4),w('helicopter?',1.8),
 w('Because',2.5,'Player B'),w('I',2.9,'Player B'),w('landed',3.3,'Player B'),w('in',3.7,'Player B'),w('a',4.1,'Player B'),w('tree',4.5,'Player B'),
 w('Hahaha',5.5),w('you',5.9),w('silly',6.3),w('pilot!',6.7),
 w('Nothing',35),w('really',35.5),w('happened',36)
];
const moment=(id,start,end,dialogue)=>({id,assetId:'v',start,end,dialogue,score:50});
const clips=[
 moment('rich',.7,7.3,'Why crash helicopter? Because I landed in a tree Hahaha'),
 moment('overlap',1.1,6.4,'Why crash helicopter? Because I landed in a tree'),
 moment('weak',34.9,36.4,'Nothing really happened')
];
test('structure review gives grounded reasons and distinguishes complete exchanges from short filler',()=>{
 const rich=reviewClipStructure(clips[0],words),weak=reviewClipStructure(clips[2],words);
 assert(rich.score>weak.score);
 assert(rich.hasMultipleSpeakers);
 assert(rich.hasQuestion);
 assert(rich.hasReaction);
 assert.match(rich.reason,/multiple speakers/);
 assert(!weak.hasReaction);
 assert(!rich.reason.includes('100% funny'));
});
test('sort/filters use only source dialogue; no invented moments or off-source words',()=>{
 const ranked=orderClipSuggestions(clips,words,{sort:'structure'});
 assert.equal(ranked[0].moment.id,'rich');
 assert.deepEqual(orderClipSuggestions(clips,words,{reactionOnly:true}).map(x=>x.moment.id),['rich','overlap']);
 assert.deepEqual(orderClipSuggestions(clips,words,{multiSpeakerOnly:true}).map(x=>x.moment.id),['rich','overlap']);
 assert.equal(orderClipSuggestions(clips,words,{sort:'source'})[0].moment.id,'rich');
});
test('curation avoids overlapping repeats and preserves actual source identities',()=>{
 const out=suggestDiverseSelection(clips,words,{count:5});
 assert.deepEqual(out.map(x=>x.id),['rich','weak']);
 assert.equal(clips.length,3,'suggestions only; never mutate the original source proposals');
});
test('every app workspace shows a direct, usable next step',()=>{
 for(const tab of ['media','transcript','director','humor','editor','export','settings','tools']){
  const p={assets:[{id:'v'}],words:[w('A',1)],segments:[{id:'x'}]};
  const next=nextStep(p,tab);
  assert(next.headline&&next.action&&next.detail);
  const html=studioGuideHTML(p,tab);
  assert.match(html,/data-guide-tab="media"/);
  assert.match(html,/data-guide-tab="transcript"/);
  assert.match(html,/data-guide-tab="editor"/);
  assert.match(html,/id="toggleEasyUI"/);
  assert(html.includes(next.headline));
 }
});
test('missing media, missing captions, empty timeline lead to appropriate real actions',()=>{
 assert.equal(nextStep({assets:[],words:[],segments:[]},'export').destination,'media');
 assert.equal(nextStep({assets:[{id:'v'}],words:[],segments:[]},'humor').destination,'transcript');
 assert.equal(nextStep({assets:[{id:'v'}],words:[w('A',2)],segments:[]},'export').destination,'humor');
});
