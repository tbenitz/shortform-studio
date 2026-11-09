import test from 'node:test';
import assert from 'node:assert/strict';
import {transcriptTurns,findLocalHumor,rawDialogueOnly,makeCompilationSegments,classifyHumorWithAI} from '../src/humor-studio.js';

const videos=[{id:'video-A',name:'gameplay.mp4',type:'video',duration:90},{id:'video-B',name:'call.mp4',type:'video',duration:90}];
function speech(text,assetId,start,speaker='Speaker 1'){
 const tokens=text.split(/\s+/);
 return tokens.map((token,i)=>({id:assetId+':'+start+':'+i,assetId,text:token,start:start+i*.22,end:start+(i+1)*.22,speaker}));
}
const words=[
 ...speech('No way! You just crashed our helicopter into a TREE?!','video-A',1,'Player A'),
 ...speech('Dude I thought we were going to land on the roof!','video-A',5,'Player B'),
 ...speech('Hahaha I cannot believe that happened you absolute clown!','video-A',8,'Player A'),
 ...speech('The installation documentation describes technical configuration parameters.','video-A',52,'Player A'),
 ...speech('That was hilarious! You are kidding me.','video-B',3,'Player C')
];
test('groups real speech without rewording or merging separate source files',()=>{
 const groups=transcriptTurns(words,'video-A');
 assert(groups.length>=3);
 assert(groups.some(x=>x.text.includes('crashed our helicopter')));
 assert(groups.every(x=>x.assetId==='video-A'));
});
test('local suggestions link to real source times and exclude dry technical segment',()=>{
 const found=findLocalHumor(words,videos,{minScore:45});
 assert(found.length>=1);
 assert(found.every(m=>m.end<30||m.assetId==='video-B'));
 assert(found.every(m=>m.dialogue.length&&m.assetId&&m.start>=0&&m.end>m.start));
 assert(!found.some(m=>m.dialogue.includes('installation documentation')));
});
test('raw dialogue export contains no summaries, timestamps, scores, or invented wording',()=>{
 const found=findLocalHumor(words,videos,{minScore:45});
 const plain=rawDialogueOnly(found);
 assert.match(plain,/No way!/);
 assert(!plain.includes('Local wording'));
 assert(!plain.includes('00:00'));
 assert(!plain.includes('100/100'));
});
test('user-specified compilation order controls actual source ranges',()=>{
 const selected=[
 {id:'2',assetId:'video-B',start:3,end:7,dialogue:'Hi'},
 {id:'1',assetId:'video-A',start:1,end:10,dialogue:'Hi'},
 ];
 const clips=makeCompilationSegments(selected,videos,{zoom:2,cropMode:'auto'});
 assert.deepEqual(clips.map(c=>c.assetId),['video-B','video-A']);
 assert.equal(clips[0].cropMode,'auto');
 assert.equal(clips[1].zoom,2);
 assert.throws(()=>makeCompilationSegments([{id:'wrong',assetId:'unknown',start:1,end:3}],videos),/Missing or invalid/);
});
test('AI returns only real source transcript indices and discards invented index 999',async()=>{
 const previous=globalThis.fetch,requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({selections:[{first:0,last:1,why:'comic setup and reply'},{first:999,last:999,why:'invented'}]})}}]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const result=await classifyHumorWithAI(words,videos.slice(0,1),{endpoint:'https://example.invalid/api',model:'test',key:'secret',maxCalls:1});
  assert.equal(requests.length,1);
  assert.equal(result.moments.length,1);
  assert.match(result.moments[0].dialogue,/crashed our helicopter/);
  assert(!result.moments[0].dialogue.includes('invented'));
  assert.equal(result.complete,true);
 }finally{globalThis.fetch=previous}
});
