import test from 'node:test';
import assert from 'node:assert/strict';
import {visualSampleTimes,analyzeVisualSamples,visualHealthHTML,scanOriginalVideoFrames} from '../src/source-visual-qa.js';

test('evenly samples a bounded span instead of loading every frame',()=>{
 const times=visualSampleTimes(3*60*60,24);
 assert.equal(times.length,24);
 assert.ok(times[0]>=0&&times.at(-1)<10800);
 assert.ok(times.every((t,i)=>i===0||t>times[i-1]));
 assert.equal(visualSampleTimes(.3).length,1);
 assert.throws(()=>visualSampleTimes(0),/duration/i);
});
test('only labels possible black samples, not proven corruption',()=>{
 const samples=[
  {time:0,meanLuma:.01,blackPixelRatio:.98,signature:'a'},
  {time:2,meanLuma:.01,blackPixelRatio:.98,signature:'a'},
  {time:4,meanLuma:.44,blackPixelRatio:.1,signature:'b'}
 ];
 const result=analyzeVisualSamples(samples);
 assert.equal(result.darkSamples,2);
 assert.equal(result.warnings.filter(w=>w.code==='POSSIBLE_BLACK_FRAME').length,2);
 assert.equal(result.verifiedFullSource,false);
 assert.equal(result.verifiedExport,false);
 assert.equal(result.classifiedVisualAction,false);
});
test('stable repeated frames are only flagged as possible static scenes',()=>{
 const samples=[
  {time:1,meanLuma:.5,blackPixelRatio:0,signature:'same'},
  {time:5,meanLuma:.5,blackPixelRatio:0,signature:'same'},
  {time:9,meanLuma:.5,blackPixelRatio:0,signature:'same'},
  {time:14,meanLuma:.5,blackPixelRatio:0,signature:'different'}
 ];
 const result=analyzeVisualSamples(samples);
 assert.equal(result.warnings.filter(w=>w.code==='POSSIBLE_STATIC_OR_FROZEN_IMAGE').length,1);
 assert.ok(/static footage/.test(result.warnings[0].description));
});
test('untrusted source and warning text are escaped in UI',()=>{
 const html=visualHealthHTML({
  selectedAsset:'a',
  assets:[{id:'a',name:'<svg onload=alert(1)>',type:'video'}],
  visualHealthReports:{a:{sourceName:'<img>',sampleCount:24,sampledAt:'today',warnings:[{code:'<script>',sourceTime:10}]}}
 });
 assert.ok(html.includes('&lt;svg'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
});
test('true browser-only scanner fails clearly in node instead of claiming success',async()=>{
 await assert.rejects(scanOriginalVideoFrames({size:3}),/browser cannot decode/i);
});
