import test from 'node:test';
import assert from 'node:assert/strict';
import {openAudioReader,appendResampledSample,SAMPLE_RATE} from '../src/audio-reader.js';
const fakeSample=(time=0,frames=480,sr=48000)=>({
 sampleRate:sr,numberOfChannels:2,numberOfFrames:frames,timestamp:time,
 allocationSize:()=>frames*2*4,
 copyTo:(dest)=>{for(let i=0;i<frames;i++){dest[i*2]=.4;dest[i*2+1]=.2}},
 close(){this.closed=true}
});
test('downsamples short PCM sections correctly',()=>{
 const out=new Float32Array(160),s=fakeSample(0,480);
 const added=appendResampledSample(out,0,s);
 assert.equal(added,160);assert.ok(out.every(x=>Math.abs(x-.3)<.00001));
});
test('streaming reader never loads entire multi-hour source',async()=>{
 const windows=[],samples=[],largeSource={size:10000000000,arrayBuffer(){throw Error('Full-file decode is forbidden')}};
 class Input{constructor(){this.disposed=false}async getPrimaryAudioTrack(){return {canDecode:async()=>true,getDurationFromMetadata:async()=>10800}}dispose(){this.disposed=true}}
 class BlobSource{constructor(file){assert.equal(file,largeSource)}}
 class AudioSampleSink{samples(start,end){windows.push([start,end]);return (async function*(){const s=fakeSample(start,48000,48000);samples.push(s);yield s})()}}
 const reader=await openAudioReader(largeSource,{moduleLoader:async()=>({Input,BlobSource,AudioSampleSink,ALL_FORMATS:[]})});
 assert.equal(reader.duration,10800);
 for(const [a,b] of [[0,12],[3600,3612],[10788,10800]]){const pcm=await reader.readRange(a,b);assert.equal(pcm.length,12*SAMPLE_RATE)}
 assert.deepEqual(windows,[[0,12],[3600,3612],[10788,10800]]);
 assert.ok(samples.every(x=>x.closed));reader.close();
});
test('enforces small memory-bounded decode windows',async()=>{
 class Input{async getPrimaryAudioTrack(){return {canDecode:async()=>true,getDurationFromMetadata:async()=>10800}}dispose(){}}
 class BlobSource{}
 class AudioSampleSink{}
 const r=await openAudioReader({},{moduleLoader:async()=>({Input,BlobSource,AudioSampleSink,ALL_FORMATS:[]})});
 await assert.rejects(r.readRange(0,60),/maximum decoding window/);
 r.close();
});
test('unsupported formats produce actionable message without attempting whole-file decode',async()=>{
 class Input{async getPrimaryAudioTrack(){return {canDecode:async()=>false}}dispose(){}}
 class BlobSource{}
 await assert.rejects(openAudioReader({},{moduleLoader:async()=>({Input,BlobSource,ALL_FORMATS:[]})}),/codec is not supported/);
});
