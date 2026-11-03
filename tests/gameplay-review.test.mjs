import test from 'node:test';import assert from 'node:assert/strict';
import {gameplayReviewInput,reviewPvPWithAI} from '../src/gameplay-review.js';
const clip=(id,start)=>({id,title:'Possible action',score:62,duration:30,source:'pvp-evidence',segments:[{assetId:'a',start,end:start+30}],gameplay:{explanation:['Combat-like audio activity (unverified)']}});
const words=Array.from({length:100},(_,i)=>({assetId:'a',start:i*2,end:i*2+.9,text:i%2?'why':'bro'}));
test('review sends timestamps and actual transcript, no images or invented HUD labels',()=>{
 const x=gameplayReviewInput(clip('one',100),words);assert.equal(x.contexts[0].start,100);assert.ok(x.contexts[0].transcript.includes('bro'));assert.ok(x.evidence[0].includes('unverified'));
});
test('remote narrative critique prioritizes funny clips without cutting the gunfight',async()=>{
 const x=[clip('a',100),clip('b',200)],calls=[];
 const result=await reviewPvPWithAI(x,words,{maxAICalls:1,providerUrl:'https://api.test',providerModel:'model',directorInstructions:'prioritize funny banter'},'dummy',()=>{},{
  fetcher:async(_,opts)=>{calls.push(JSON.parse(opts.body));return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reviews:[{id:'a',quality:30,keep:false,title:'Weak reaction',reason:'No payoff'},{id:'b',quality:97,keep:true,title:'Surprise fight',reason:'Clear reaction after combat'}]})}}]})}},
  wait:async()=>{}
 });
 assert.equal(calls.length,1);assert.ok(calls[0].messages[1].content.includes('prioritize funny banter'));
 assert.equal(result[0].id,'b');assert.equal(result[0].segments[0].start,200);assert.equal(result[0].aiReview,'approved');
 assert.equal(result[1].aiReview,'review-needed');
});
test('HTTP 503 retains locally scored gameplay clips and original segments',async()=>{
 const result=await reviewPvPWithAI([clip('a',100)],words,{maxAICalls:1,providerUrl:'https://api.test'},'key',()=>{},{
  fetcher:async()=>({ok:false,status:503,text:async()=>('busy'),headers:{get:()=>null}}),wait:async()=>{}
 });
 assert.equal(result.length,1);assert.equal(result[0].segments[0].start,100);assert.equal(result[0].aiReview,'not-reviewed');
});
