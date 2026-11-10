import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteCandidates} from '../src/director.js';
import {classifyHumorWithAI,findLocalHumor} from '../src/humor-studio.js';
import {discoverFullRecording} from '../src/director-coverage.js';
const say=(line,assetId,start,speaker)=>line.split(/\s+/).map((text,i)=>({id:assetId+':'+start+':'+i,text,assetId,start:start+i*.25,end:start+(i+1)*.25,speaker}));
const words=[
 ...say('Do you remember when you said you could land that helicopter safely','cam',3,'Alice'),
 ...say('Yes I was confident right up until I saw the enormous tree','cam',6.7,'Bob'),
 ...say('You crashed into the tree and everyone laughed at that terrible landing','cam',10,'Alice'),
 ...say('That was the funniest thing you have ever done to my helicopter','cam',13.6,'Bob'),
 ...say('Nobody believed the helicopter could fly in the first place','cam',28,'Alice')
];
test('local raw director keeps actual connected conversation as one source cut with lead-in and reaction',()=>{
 const entries=[
  {id:'a',assetId:'cam',start:3,end:6,text:'Can you land this helicopter',speaker:'A',keywords:['helicopter','land']},
  {id:'b',assetId:'cam',start:7,end:9,text:'Yes I think so',speaker:'B',keywords:['helicopter']},
  {id:'c',assetId:'cam',start:10,end:12,text:'You crashed it in the tree haha',speaker:'A',keywords:['helicopter','crash']},
  {id:'d',assetId:'cam',start:13,end:17,text:'And everyone is laughing',speaker:'B',keywords:['helicopter','laugh']},
  {id:'e',assetId:'cam',start:85,end:87,text:'Different topic',speaker:'A',keywords:['different','topic']}
 ];
 const clips=discoverFullRecording(entries,[{id:'cam',name:'camera',duration:120}],{clipMin:0,clipMax:0,mode:'comedy',clipCount:0,allowNonlinear:false});
 assert.ok(clips.some(c=>c.segments.length===1&&c.segments[0].start<=3.1&&c.segments[0].end>=17));
 assert.ok(clips.every(c=>c.segments.every(s=>s.end<=120)));
});
test('remote director joins successive transcript turns and does not append generic keyword proposals to an AI result',async()=>{
 let count=0;
 const result=await remoteCandidates(words,[{id:'cam',duration:120,name:'recording.mp4'}],{
  providerUrl:'https://example.test/ai',providerModel:'test',maxAICalls:1,remoteWindowSize:40,
  clipMin:0,clipMax:0,clipCount:0,minScore:0,mode:'comedy',directorInstructions:'Complete joke and punchline'
 },'test-key',()=>{}, {fetcher:async(_url,arg)=>{
  count++;const body=JSON.parse(arg.body);
  assert.match(body.messages[0].content,/setup/i);
  assert.match(body.messages[0].content,/payoff/i);
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify({clips:[{
   title:'The helicopter crash conversation',reason:'Actual setup, crash and comeback',indices:[0,1,2]
  }]})}}]})};
 }});
 assert.equal(count,1);
 assert.ok(result.length>=1);
 assert.ok(result.every(c=>c.source==='remote-ai'),'successful AI responses must not be diluted with unrelated keyword clips');
 assert.ok(result.some(c=>c.segments.length===1&&c.segments[0].start<=3&&c.segments[0].end>=12));
});
test('remote director rejects mixing clips from unrelated unsynchronized original recordings',async()=>{
 const mixed=[...words,...say('The other person is discussing a totally different thing','other',2,'Other speaker')];
 const result=await remoteCandidates(mixed,[{id:'cam',duration:120},{id:'other',duration:120}],{
  providerUrl:'https://example.test/api',providerModel:'test',maxAICalls:1,remoteWindowSize:40,
  clipMin:0,clipMax:0,clipCount:0,minScore:0,mode:'comedy'
 },'key',()=>{}, {fetcher:async(_url,arg)=>{
  const utt=JSON.parse(JSON.parse(arg.body).messages[1].content);
  const j=utt.findIndex(x=>x.assetId==='other');
  assert.ok(j>=0);
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify({clips:[{title:'Not actually linked',indices:[0,j]}]})}}]})};
 }});
 assert.equal(result.length,0);
});
test('AI humor scan with only two affordable requests samples later original transcript hours',async()=>{
 const longWords=[];
 for(let i=0;i<65;i++)longWords.push(...say('Why did the helicopter crash there that is ridiculous','cam',i*280,'Speaker '+(i%2+1)));
 const prior=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{
  const parsed=JSON.parse(options.body),trans=parsed.messages[1].content;
  calls.push(trans);
  return new Response(JSON.stringify({choices:[{message:{content:'{"selections":[]}'} }]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const result=await classifyHumorWithAI(longWords,[{id:'cam',name:'Long VOD',duration:65*280}],{
   endpoint:'https://example.test/ai',model:'test',key:'secret',maxCalls:2,chunkSize:8
  });
  assert.equal(calls.length,2);
  assert.equal(result.complete,false);
  assert.equal(result.processedBatches,2);
  assert.ok(Number(JSON.parse(calls[0].split('Transcript:\n')[1])[0].start)>1000);
  assert.ok(Number(JSON.parse(calls[1].split('Transcript:\n')[1])[0].start)>9000);
 }finally{globalThis.fetch=prior}
});
test('local humor moments hold opening setup and time for the reaction from real transcript',()=>{
 const list=findLocalHumor(words,[{id:'cam',duration:120,name:'recording'}],{minScore:0});
 assert.ok(list.length>0);
 assert.ok(list.every(x=>x.start>=0&&x.end<=120));
 assert.ok(list.some(x=>x.end>14));
});
