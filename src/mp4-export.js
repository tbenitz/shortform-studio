/**
 * Encode a genuine H.264 MP4 (AAC preferred, Opus audio fallback where AAC is unavailable) using Mediabunny and WebCodecs.
 * The deployed static site vendors a pinned Mediabunny bundle during GitHub Actions.
 * No WebM -> MP4 renaming, no cloud API and no re-encoding on a server.
 */
export const mp4Mime='video/mp4';
export const isMp4Buffer=buffer=>{
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer||0);
 return bytes.byteLength>32&&String.fromCharCode(...bytes.subarray(4,8))==='ftyp'
  &&String.fromCharCode(...bytes.subarray(8,12)).match(/^[A-Za-z0-9 ]{4}$/)!==null;
};
export const MP4_SDK_SOURCES=[
 '../vendor/mediabunny/mediabunny.mjs',
 'https://cdn.jsdelivr.net/npm/mediabunny@1.65.0/dist/bundles/mediabunny.mjs',
 'https://unpkg.com/mediabunny@1.65.0/dist/bundles/mediabunny.mjs'
];
let loadedMp4Sdk=null;
/** Resolve same-origin first; recover from a GitHub Pages branch build missing
 * vendor/mediabunny. Alternate sources are pinned, never unversioned. */
export async function loadMp4Sdk(importer=url=>import(/* @vite-ignore */ url)){
 if(loadedMp4Sdk)return loadedMp4Sdk;
 const failures=[];
 for(const url of MP4_SDK_SOURCES){
  try{
   const sdk=await importer(url);
   if(sdk?.Output&&sdk?.Mp4OutputFormat&&sdk?.BufferTarget&&sdk?.MediaStreamVideoTrackSource&&sdk?.MediaStreamAudioTrackSource){
    loadedMp4Sdk=sdk;return sdk;
   }
   failures.push(url+': incompatible library');
  }catch(e){failures.push(url+': '+String(e?.message||e).slice(0,180))}
 }
 throw Error('MP4 encoder unavailable: packaged file and both pinned backup downloads failed. Check your internet access or browser extensions, then reload. '+failures.join(' | '));
}
export async function openMp4Capture(canvas,audioTrack,{fps=30,videoBitrate=6000000,audioBitrate=160000}={}){
 if(!canvas?.captureStream)throw Error('Canvas video capture is not supported by this browser.');
 if(!audioTrack)throw Error('No audio mix track is available for MP4 export.');
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder)throw Error('This browser does not expose the WebCodecs video/audio encoders needed for MP4. No WebM was exported.');
 const sdk=await loadMp4Sdk();
 const {Output,Mp4OutputFormat,BufferTarget,MediaStreamVideoTrackSource,MediaStreamAudioTrackSource,Quality}=sdk;
 if(!Output||!MediaStreamVideoTrackSource||!MediaStreamAudioTrackSource)throw Error('Bundled MP4 encoder is incompatible.');
 const width=canvas.width-(canvas.width%2),height=canvas.height-(canvas.height%2);
 if(width!==canvas.width||height!==canvas.height)throw Error('MP4 H.264 requires even pixel dimensions. Change output resolution.');
 const rate=Math.max(15,Math.min(60,Number(fps)||30));
 const output=new Output({format:new Mp4OutputFormat(),target:new BufferTarget()});
 const picture=canvas.captureStream(rate),videoTrack=picture.getVideoTracks()[0];
 if(!videoTrack)throw Error('Canvas produced no video track.');
 const video=new MediaStreamVideoTrackSource(videoTrack,{
  codec:'avc',quality:new Quality({bitrate:Math.max(500000,Math.min(25000000,Number(videoBitrate)||6000000))})
 });
 // Desktop Linux Chrome does not necessarily expose an AAC WebCodecs encoder.
 // Opus is also a supported MP4 audio codec in Mediabunny. The container
 // remains an actual ISO MP4: only the audio codec changes when AAC is missing.
 const sampleRate=Number(audioTrack.getSettings?.().sampleRate)||48000;
 const channels=2;
 const aacConfig={codec:'mp4a.40.2',sampleRate,numberOfChannels:channels,bitrate:Math.max(64000,Math.min(320000,Number(audioBitrate)||160000))};
 let aacSupported=false;
 try{aacSupported=Boolean((await globalThis.AudioEncoder.isConfigSupported(aacConfig)).supported)}catch{}
 const audioCodec=aacSupported?'aac':'opus';
 if(audioCodec==='opus'){
  const opusConfig={codec:'opus',sampleRate,numberOfChannels:channels,bitrate:128000};
  let supported=false;
  try{supported=Boolean((await globalThis.AudioEncoder.isConfigSupported(opusConfig)).supported)}catch{}
  if(!supported){videoTrack.stop();throw Error('Neither AAC nor Opus audio encoding is available for MP4 in this browser. No WebM was substituted.')}
 }
 const audio=new MediaStreamAudioTrackSource(audioTrack,{
  codec:audioCodec,quality:new Quality({bitrate:audioCodec==='aac'?aacConfig.bitrate:128000})
 });
 output.addVideoTrack(video,{frameRate:rate});output.addAudioTrack(audio);
 let fatalError=null,finished=false;
 video.errorPromise.catch(err=>{fatalError=err instanceof Error?err:Error(String(err))});
 audio.errorPromise.catch(err=>{fatalError=err instanceof Error?err:Error(String(err))});
 try{await output.start()}
 catch(err){videoTrack.stop();await output.cancel().catch(()=>{});throw Error('MP4 encoder initialization failed: '+err.message)}
 return {
  audioCodec,
  get error(){return fatalError},
  async finish(){
   if(finished)throw Error('MP4 capture has already stopped');
   finished=true;videoTrack.stop();
   video.close();audio.close();
   if(fatalError){await output.cancel().catch(()=>{});throw Error('MP4 encoding failed: '+fatalError.message)}
   try{await output.finalize()}
   catch(err){throw Error('MP4 finalization failed: '+err.message)}
   const buffer=output.target.buffer;
   if(!isMp4Buffer(buffer))throw Error('MP4 encoder produced an invalid or empty file. Nothing was downloaded.');
   return new Blob([buffer],{type:mp4Mime});
  },
  async cancel(){
   if(finished)return;
   finished=true;videoTrack.stop();video.close();audio.close();await output.cancel().catch(()=>{});
  }
 };
}
