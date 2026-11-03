import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAIWithRetry,remoteCandidates,aiRetryDelay,retryableAIStatus} from '../src/director.js';
const response=(status,body='')=>({ok:status>=200&&status<300,status,headers:{get:()=>null},async text(){return body},async json(){return body}});
test('retryable statuses are selective and delays are capped',()=>{
 for(const status of [429,500,502,503,504])assert.equal(retryableAIStatus(status),true);
 for(const status of [400,401,403,404,422])assert.equal(retryableAIStatus(status),false);
 assert.ok(aiRetryDelay(10)<=8000);
});
test('503 provider overload retries and eventually succeeds',async()=>{
 let calls=0;const delays=[],retries=[];
 const r=await fetchAIWithRetry('https://api.example.test/llm',{method:'POST'},{
  fetcher:async()=>{calls++;return calls<3?response(503,'too busy'):response(200,{});},
  wait:async ms=>delays.push(ms),
  onRetry:info=>retries.push(info)
 });
 assert.equal(r.status,200);assert.equal(calls,3);assert.equal(delays.length,2);
 assert.deepEqual(retries.map(r=>r.status),[503,503]);
});
test('persistent 503 is labeled as retryable with clear status',async()=>{
 let calls=0;await assert.rejects(fetchAIWithRetry('https://example.test',{},{
  fetcher:async()=>{calls++;return response(503,'busy')},wait:async()=>{}
 }),error=>error.retryable&&error.status===503);
 assert.equal(calls,4);
});
test('bad credentials are not retried',async()=>{
 let calls=0;await assert.rejects(fetchAIWithRetry('https://example.test',{},{
  fetcher:async()=>{calls++;return response(401,'bad token')},wait:async()=>{}
 }),/401/);assert.equal(calls,1);
});
test('transient 503 in remote Director uses labeled local fallback clips',async()=>{
 const words=[];
 for(let i=0;i<12;i++){
  const msg='I cannot believe that happened it is so funny and totally wrong haha';
  msg.split(' ').forEach((text,j)=>words.push({id:i+'-'+j,assetId:'video',start:i*10+j*.3,end:i*10+j*.3+.25,text,speaker:'Speaker 1'}));
 }
 let calls=0,notice='';
 const result=await remoteCandidates(words,[],{providerUrl:'https://example.test',providerModel:'test',maxAICalls:2,remoteWindowSize:40,clipMin:5,clipMax:30,clipCount:4,minScore:0,mode:'comedy'},'test-key',(p,m)=>notice=m,{
  fetcher:async()=>{calls++;return response(503,'busy')},wait:async()=>{}
 });
 assert.equal(calls,4);assert.ok(result.length>0,'should provide local clip suggestions');assert.ok(result.every(x=>x.source==='local-fallback'));
 assert.match(notice,/local fallback/i);
});
