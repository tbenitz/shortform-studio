import test from 'node:test';
import assert from 'node:assert/strict';
import {filterStorySuggestions,storyDiscoveryFiltersHTML,sourceStoryWorkbenchHTML} from '../src/story-workbench-ui.js';
const ms=[
 {id:'m1',assetId:'a',start:3,end:8,dialogue:'Alex: Helicopter joke hahaha',score:81},
 {id:'m2',assetId:'a',start:19,end:23,dialogue:'Blair: Building prank!',score:62},
 {id:'m3',assetId:'b',start:6,end:19,dialogue:'Alex: No way that was funny!',score:90}
];
const as=[{id:'a',name:'Original video',type:'video',url:'blob:connected',duration:100},{id:'b',name:'Missing original',type:'video',url:null,duration:100}];
test('filters real dialogue, scores, source availability and named speakers',()=>{
 assert.deepEqual(filterStorySuggestions(ms,as,{search:'helicopter'}).map(x=>x.id),['m1']);
 assert.deepEqual(filterStorySuggestions(ms,as,{speaker:'Blair'}).map(x=>x.id),['m2']);
 assert.deepEqual(filterStorySuggestions(ms,as,{onlyPlayable:true}).map(x=>x.id),['m1','m2']);
 assert.deepEqual(filterStorySuggestions(ms,as,{sort:'score'}).map(x=>x.id),['m3','m1','m2']);
 assert.deepEqual(filterStorySuggestions(ms,as,{sort:'longest'}).map(x=>x.id),['m3','m1','m2']);
});
test('source review UI has working commands, honest caveat, actual cut evidence',()=>{
 const p={name:'Test',assets:as,words:[{assetId:'a',start:4,end:5,text:'Helicopter joke',speaker:'Alex'}]};
 const html=sourceStoryWorkbenchHTML(p,[ms[0]],{}, {open:true});
 assert.match(html,/id="storyWorkbench"/);
 for(const id of ['humorSelectVisible','humorClearSelection','humorSortChronological','humorRemoveDuplicates','humorAddSetup','humorAddPayoff','humorTrimToWords','humorExportEvidence','humorExportEditPlan'])assert(html.includes('id="'+id+'"'),id);
 assert.match(html,/Original video/);assert.match(html,/not actual visual action/i);
 const filters=storyDiscoveryFiltersHTML(ms,as,{search:'helicopter'});
 assert.match(filters,/id="humorSearch"/);assert.match(filters,/id="humorSort"/);
});
