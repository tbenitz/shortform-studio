/**
 * Local bounded container probe and real decoded-frame seek check.
 * A recognized file header does not establish codec compatibility.
 */
const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SUPPORTED_CONTAINERS=['mp4','m4v','mov','mkv','webm','avi','ts'];
export function guessSourceContainer(filename,bytes){
 const extension=String(filename||'').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]||'unknown';
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||0);
 const ascii=(at,count)=>String.fromCharCode(...data.subarray(at,at+count));
 let signature='unknown';
 if(data.length>=12&&ascii(4,4)==='ftyp')signature='ISO BMFF / QuickTime family';
 else if(data.length>=4&&data[0]===0x1a&&data[1]===0x45&&data[2]===0xdf&&data[3]===0xa3)signature='EBML (Matroska/WebM family)';
 else if(data.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='AVI ')signature='AVI';
 else if(data.length>=1&&data[0]===0x47)signature='Possible MPEG transport stream';
 const extensionRecognized=SUPPORTED_CONTAINERS.includes(extension);
 return {extension,extensionRecognized,headerFamily:signature,codecVerified:false,
  conclusion:extensionRecognized&&signature!=='unknown'?'Recognized container family, decoder compatibility NOT yet verified.':
   'No reliable container/codec compatibility conclusion from file header alone.'};
}
async function awaitEvent(media,events,ms,signal,act=()=>{}){
 return new Promise((resolve,reject)=>{
  let timer,done=false;
  const clear=()=>{for(const e of events)media.removeEventListener(e,pass);media.removeEventListener('error',fail);signal?.removeEventListener('abort',cancel);clearTimeout(timer)};
  const settle=(fn,val)=>{if(done)return;done=true;clear();fn(val)};
  const pass=()=>settle(resolve);
  const fail=()=>settle(reject,Error('This browser could not decode the selected original video.'));
  const cancel=()=>settle(reject,Error('Source decoding check canceled.'));
  for(const e of events)media.addEventListener(e,pass);
  media.addEventListener('error',fail);signal?.addEventListener('abort',cancel,{once:true});
  timer=setTimeout(()=>settle(reject,Error('Decoding timed out at this source position. Unsupported codec or a damaged recording is possible.')),ms);
  if(signal?.aborted){cancel();return}
  try{act()}catch(e){settle(reject,e)}
 });
}
/** Tests actual browser decoding at the beginning and middle of the source. */
export async function inspectSourceDecode(file,{signal=null,onProgress=()=>{}}={}){
 if(!file||typeof file.slice!=='function'||!Number.isFinite(file.size))throw Error('Relink a real local source File.');
 const header=guessSourceContainer(file.name,new Uint8Array(await file.slice(0,64).arrayBuffer()));
 if(typeof document==='undefined'||!globalThis.URL?.createObjectURL)
  return {header,status:'unavailable',reason:'Actual browser decoding requires Chromium browser media elements.'};
 const video=document.createElement('video'),url=URL.createObjectURL(file);
 video.muted=true;video.playsInline=true;video.preload='metadata';
 const result={header,status:'warning',metadataDecoded:false,samples:[],codecVerified:false,
  originalFileSize:file.size,checkedAt:new Date().toISOString(),
  note:'Only actual decoder readiness at two positions is checked; no full recording scan, audio stream decoding or MP4 export validation.'};
 try{
  await awaitEvent(video,['loadedmetadata'],15000,signal,()=>{video.src=url;video.load()});
  const duration=video.duration;
  if(!Number.isFinite(duration)||duration<=0||!video.videoWidth||!video.videoHeight)
   throw Error('Missing decoded video width, height or duration.');
  result.metadataDecoded=true;result.durationSeconds=duration;result.videoWidth=video.videoWidth;result.videoHeight=video.videoHeight;
  const times=[Math.min(.2,duration/4),duration>10?duration*.5:Math.max(.2,duration*.75)].map(t=>Math.min(Math.max(0,duration-.05),t));
  const seen=new Set();
  for(const at of times){
   if(seen.has(at))continue;seen.add(at);
   if(signal?.aborted)throw Error('Probe canceled.');
   await awaitEvent(video,['seeked'],15000,signal,()=>video.currentTime=at);
   if(video.readyState<2)await awaitEvent(video,['loadeddata','canplay'],10000,signal);
   if(!video.videoWidth||!video.videoHeight)throw Error('Browser returned no decoded image dimensions.');
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=18;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas inspection is unavailable.');
   ctx.drawImage(video,0,0,32,18);ctx.getImageData(0,0,1,1);
   result.samples.push({requestedTime:Number(at.toFixed(3)),decodedSourceTime:Number(video.currentTime.toFixed(3)),width:video.videoWidth,height:video.videoHeight});
   onProgress(result.samples.length/times.length,result.samples.at(-1));
  }
  result.status='sampled-decoder-ready';result.codecVerified=true;
  result.note='Actual video frames decoded at the requested source points. Other timestamps, audio codecs and export compatibility remain UNVERIFIED.';
  return result;
 }catch(e){result.status='failed';result.reason=e.message;return result}
 finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
}
export function mediaCompatibilityHTML(asset,{busy=false,status=''}={}){
 if(!asset||asset.type!=='video')return '';
 const prior=asset.sourceDecodeReport;
 const result=prior?'<p class="tiny muted">Previous original source probe: '+html(prior.status)+' · '+(prior.samples?.length||0)+' decoded frames · '+html(prior.note||prior.reason||'')+'</p>':'<p class="tiny muted">Not tested on this original source yet.</p>';
 return '<details id="sourceFormatDetails" class="story-workbench"><summary>Real source codec & random-seek test</summary>'+
 '<p class="tiny muted">MP4, MOV, MKV, WebM, AVI, M4V and TS are recognized file families, but browser decoding varies by actual codec. This feature tests two real decoded frames without loading the entire video into memory, and does not infer audio compatibility.</p>'+
 '<button class="full" id="sourceProbeDecode" '+(busy?'disabled':'')+'>'+(busy?'Checking two source frames…':'Test original video decoder at start and middle')+'</button>'+
 '<p id="sourceProbeStatus" class="tiny muted">'+html(status||'Ready to inspect the selected source.')+'</p>'+result+'</details>';
}
