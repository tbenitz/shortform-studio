/** Bounded audio decoding for long recordings. Never read the complete video file into RAM. */
export const SAMPLE_RATE=16000;
let loaderPromise;
export async function loadStreamingMedia(){
 if(loaderPromise)return loaderPromise;
 const local=new URL('../vendor/mediabunny/mediabunny.mjs',import.meta.url).href;
 loaderPromise=(async()=>{let last;
  for(const url of [local,'https://cdn.jsdelivr.net/npm/mediabunny@1.65.0/dist/bundles/mediabunny.mjs']){
   try{const m=await import(url);if(typeof m.Input==='function'&&typeof m.AudioSampleSink==='function')return m;throw Error('Unsupported streaming media bundle')}
   catch(e){last=e}
  }
  throw Error('Streaming audio decoder unavailable. Reload the page after deployment, or import an audio-only WAV/MP3 file. '+(last?.message||''));
 })().catch(e=>{loaderPromise=null;throw e});
 return loaderPromise;
}
/** Fill one bounded 16 kHz mono buffer from a decoded AudioSample. All input samples are closed. */
export function appendResampledSample(pcm,rangeStart,sample){
 const sr=Number(sample.sampleRate),channels=Number(sample.numberOfChannels);
 if(!Number.isFinite(sr)||sr<8000||!Number.isFinite(channels)||channels<1||channels>16)throw Error('Invalid audio track sample format');
 const frames=Number(sample.numberOfFrames);
 if(!frames)return 0;
 const opts={planeIndex:0,format:'f32'};
 const length=sample.allocationSize(opts)/4;
 if(length>48000*16*30)throw Error('Decoder returned an unexpectedly large audio frame');
 const data=new Float32Array(length);
 sample.copyTo(data,opts);
 const sampleStart=Number(sample.timestamp);
 if(!Number.isFinite(sampleStart))return 0;
 const first=Math.max(0,Math.ceil((sampleStart-rangeStart)*SAMPLE_RATE));
 const last=Math.min(pcm.length,Math.ceil((sampleStart+frames/sr-rangeStart)*SAMPLE_RATE));
 let filled=0;
 for(let i=first;i<last;i++){
  const position=((rangeStart+i/SAMPLE_RATE)-sampleStart)*sr;
  const lo=Math.max(0,Math.min(frames-1,Math.floor(position))),hi=Math.min(frames-1,lo+1);
  const frac=Math.max(0,Math.min(1,position-lo));
  let v=0;
  for(let channel=0;channel<channels;channel++)v+=(data[lo*channels+channel]*(1-frac)+data[hi*channels+channel]*frac);
  pcm[i]=v/channels;filled++;
 }
 return filled;
}
/** Input is backed by BlobSource random-access slices, not file.arrayBuffer(). */
export async function openAudioReader(file,{moduleLoader=loadStreamingMedia,durationHint=0,onStatus=()=>{}}={}){
 const m=await moduleLoader();
 const input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(file)});
 try{
  const track=await input.getPrimaryAudioTrack();
  if(!track)throw Error('No audio track found in this file');
  if(!(await track.canDecode()))throw Error('The audio codec is not supported by Chrome WebCodecs. Convert the audio to AAC, Opus or WAV and retry.');
  let duration=Number(await track.getDurationFromMetadata());
  if(!(duration>0))duration=Number(durationHint)||Number(await track.computeDuration());
  if(!Number.isFinite(duration)||duration<=0)throw Error('Unable to determine audio duration');
  const sink=new m.AudioSampleSink(track);
  let closed=false;
  return {
   duration,
   async readRange(start,end,{signal}={}){
    if(closed)throw Error('Audio reader already closed');
    if(signal?.aborted)throw Error('Transcription paused');
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration+.1||end-start>45)
     throw Error('Invalid audio window; maximum decoding window is 45 seconds');
    const pcm=new Float32Array(Math.ceil((end-start)*SAMPLE_RATE));
    let decodedSamples=0;
    // Each iterator reads only this window. close() frees decoder memory immediately.
    for await(const sample of sink.samples(start,Math.min(duration,end))){
     try{if(signal?.aborted)throw Error('Transcription paused');appendResampledSample(pcm,start,sample);decodedSamples++}
     finally{sample.close()}
    }
    if(!decodedSamples)onStatus('No decoded audio samples in '+start.toFixed(1)+'–'+end.toFixed(1)+'s; recording may contain silence or an unsupported section');
    return pcm;
   },
   close(){if(!closed){closed=true;input.dispose()}}
  };
 }catch(e){input.dispose();throw e}
}
