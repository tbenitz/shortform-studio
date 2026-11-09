/**
 * Encode a real H.264/AAC MP4 using Mediabunny and WebCodecs.
 * The deployed static site vendors a pinned Mediabunny bundle during GitHub Actions.
 * No WebM -> MP4 renaming, no cloud API and no re-encoding on a server.
 */
export const mp4Mime='video/mp4';
export const isMp4Buffer=buffer=>{
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer||0);
 return bytes.byteLength>32&&String.fromCharCode(...bytes.subarray(4,8))==='ftyp'
  &&String.fromCharCode(...bytes.subarray(8,12)).match(/^[A-Za-z0-9 ]{4}$/)!==null;
};
export async function openMp4Capture(canvas,audioTrack,{fps=30,videoBitrate=6000000,audioBitrate=160000}={}){
 if(!canvas?.captureStream)throw Error('Canvas video capture is not supported by this browser.');
 if(!audioTrack)throw Error('No audio mix track is available for MP4 export.');
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder)throw Error('This browser does not expose the H.264/AAC WebCodecs encoders required for MP4. No WebM file was exported.');
 let sdk;
 try{sdk=await import('../vendor/mediabunny/mediabunny.mjs')}
 catch(e){throw Error('The MP4 encoder library did not load: '+e.message+'. Reload the page online to update its cache.')}
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
 const audio=new MediaStreamAudioTrackSource(audioTrack,{
  codec:'aac',quality:new Quality({bitrate:Math.max(64000,Math.min(320000,Number(audioBitrate)||160000))})
 });
 output.addVideoTrack(video,{frameRate:rate});output.addAudioTrack(audio);
 let fatalError=null,finished=false;
 video.errorPromise.catch(err=>{fatalError=err instanceof Error?err:Error(String(err))});
 audio.errorPromise.catch(err=>{fatalError=err instanceof Error?err:Error(String(err))});
 try{await output.start()}
 catch(err){videoTrack.stop();await output.cancel().catch(()=>{});throw Error('MP4 encoder initialization failed: '+err.message)}
 return {
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
