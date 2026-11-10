/**
 * Real decoded-source frame sampling, local only.
 * This is a sparse review aid, not an exhaustive corruption detector,
 * not a gameplay classifier, and not proof that the final MP4 is valid.
 */
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(Number(n)*1000)/1000;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function visualSampleTimes(duration,count=24){
 const length=Number(duration);
 if(!Number.isFinite(length)||length<=0)throw Error('Source video duration is unavailable or invalid.');
 const n=clamp(Math.round(Number(count)||24),2,60),end=Math.max(.01,length-.075);
 if(length<.5)return [Math.min(.05,end)];
 return Array.from({length:n},(_,i)=>round(.05+(end-.05)*i/(n-1)))
  .filter((t,i,all)=>i===0||t>all[i-1]+.001);
}
export function analyzeVisualSamples(samples,{blackLuma=.045,blackPixels=.96,frozenCount=3}={}){
 const ordered=(Array.isArray(samples)?samples:[]).filter(x=>
  Number.isFinite(x?.time)&&Number.isFinite(x?.meanLuma)&&Number.isFinite(x?.blackPixelRatio))
  .sort((a,b)=>a.time-b.time);
 const warnings=[],dark=ordered.filter(s=>s.meanLuma<=blackLuma&&s.blackPixelRatio>=blackPixels);
 for(const sample of dark)warnings.push({
  code:'POSSIBLE_BLACK_FRAME',severity:'review',sourceTime:round(sample.time),
  description:'Sampled source frame was nearly black. This may be an intentional fade, not corruption.'
 });
 let run=1;
 for(let i=1;i<ordered.length;i++){
  const prev=ordered[i-1],cur=ordered[i];
  if(cur.signature&&prev.signature&&cur.signature===prev.signature&&cur.time-prev.time>.35&&
      !(cur.blackPixelRatio>=blackPixels&&prev.blackPixelRatio>=blackPixels))run++;
  else run=1;
  if(run===frozenCount){
   warnings.push({code:'POSSIBLE_STATIC_OR_FROZEN_IMAGE',severity:'review',
    sourceTime:round(ordered[i-frozenCount+1].time),endTime:round(cur.time),
    description:'Similar decoded samples across time could be static footage or a frozen source, not verified corruption.'});
  }
 }
 return {sampleCount:ordered.length,darkSamples:dark.length,warnings,
  classifiedVisualAction:false,verifiedFullSource:false,verifiedExport:false,
  limitation:'Sparse decoded original-source frames only. Uninspected seconds can have missing frames. Static shots and fades may be intentional.'};
}
function awaitMedia(video,events,signal,timeoutMs=15000,onStart=()=>{}){
 return new Promise((resolve,reject)=>{
  let done=false,timer;
  const cleanup=()=>{
   for(const name of events)video.removeEventListener(name,ok);
   video.removeEventListener('error',fail);
   signal?.removeEventListener('abort',abort);
   clearTimeout(timer);
  };
  const settle=(fn,value)=>{if(done)return;done=true;cleanup();fn(value)};
  const ok=()=>settle(resolve);
  const fail=()=>settle(reject,Error('Browser could not decode this source video. Try H.264 MP4 or a supported WebM for this Chromebook.'));
  const abort=()=>settle(reject,Error('Source visual scan canceled.'));
  for(const name of events)video.addEventListener(name,ok);
  video.addEventListener('error',fail);
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>settle(reject,Error('Timed out decoding the requested source frame. Media may be unsupported or damaged.')),timeoutMs);
  if(signal?.aborted){abort();return}
  try{onStart()}catch(error){settle(reject,error)}
 });
}
async function seekFrame(video,seconds,signal){
 if(signal?.aborted)throw Error('Source visual scan canceled.');
 const expected=clamp(seconds,0,Math.max(0,video.duration-.04));
 if(Math.abs(video.currentTime-expected)<.002&&video.readyState>=2)return;
 await awaitMedia(video,['seeked'],signal,16000,()=>{video.currentTime=expected});
 if(video.readyState<2)await awaitMedia(video,['loadeddata','canplay'],signal,12000);
 if(!video.videoWidth||!video.videoHeight)throw Error('Decoded source frame has no usable dimensions.');
}
function frameSignature(data){
 const rgba=data.data;
 let sum=0,black=0,sig=2166136261;
 // Tiny 32x18 thumbnail; keep no pixels in the saved project.
 for(let i=0;i<rgba.length;i+=4){
  const y=(.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2])/255;
  sum+=y;if(y<.07)black++;
  const coarse=Math.round(y*15);
  sig=Math.imul(sig^coarse,16777619)>>>0;
 }
 const pixels=rgba.length/4;
 return {meanLuma:round(sum/pixels),blackPixelRatio:round(black/pixels),
  signature:sig.toString(16).padStart(8,'0')};
}
export async function scanOriginalVideoFrames(file,{count=24,signal=null,onProgress=()=>{}}={}){
 if(!file||typeof file.size!=='number')throw Error('Relink a real local source file before scanning.');
 if(typeof document==='undefined'||!globalThis.URL?.createObjectURL)throw Error('This browser cannot decode local video frames.');
 const video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.preload='auto';
 const url=URL.createObjectURL(file);
 try{
  await awaitMedia(video,['loadedmetadata'],signal,20000,()=>{video.src=url;video.load()});
  const length=video.duration;
  if(!Number.isFinite(length)||length<=0||!video.videoWidth||!video.videoHeight)
   throw Error('Missing video duration or decoded dimensions. Convert/relink a supported source first.');
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=18;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('2D frame inspection is unavailable in this browser.');
  const samples=[],times=visualSampleTimes(length,count);
  for(let i=0;i<times.length;i++){
   if(signal?.aborted)throw Error('Source visual scan canceled.');
   await seekFrame(video,times[i],signal);
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   const metrics=frameSignature(ctx.getImageData(0,0,canvas.width,canvas.height));
   samples.push({time:round(video.currentTime),...metrics});
   onProgress((i+1)/times.length,{time:samples.at(-1).time,completed:i+1,total:times.length});
  }
  const analysis=analyzeVisualSamples(samples);
  return {kind:'shortform-source-visual-samples-v1',sourceName:String(file.name||'Original recording'),
   sourceSize:file.size,sourceLastModified:Number(file.lastModified)||null,
   sampledAt:new Date().toISOString(),width:video.videoWidth,height:video.videoHeight,
   durationSeconds:round(length),samples,...analysis};
 }finally{
  video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
 }
}
export function visualHealthHTML(project,{busy=false,status=''}={}){
 const rows=Object.entries(project?.visualHealthReports||{}).map(([id,r])=>{
  const asset=(project.assets||[]).find(a=>a.id===id);
  return '<article><b>'+esc(asset?.name||r.sourceName||id)+'</b><p class="tiny muted">'+
   Number(r.sampleCount||0)+' decoded samples · '+Number(r.warnings?.length||0)+' review warnings · '+
   esc(r.sampledAt||'unknown date')+'</p>'+
   (r.warnings||[]).slice(0,8).map(w=>'<p class="tiny">'+esc(w.code)+' at '+esc(String(w.sourceTime))+' seconds</p>').join('')+
   '</article>';
 }).join('');
 const chosen=(project?.assets||[]).find(a=>a.id===project?.selectedAsset);
 return '<div class="separator"></div><details id="visualHealthDetails"><summary><b>Inspect actual original video frames</b></summary>'+
  '<p class="tiny muted">Samples 24 decoded frames across the selected original recording. Near-black and repeated frames are review clues, not proof of damage, missing action or a valid final export. Does not upload footage or decode every frame.</p>'+
  '<p class="tiny muted">Selected source: '+esc(chosen?.name||'None')+'</p>'+
  '<button class="full" type="button" id="toolsScanVisual" '+(busy||chosen?.type!=='video'?'disabled':'')+'>'+ (busy?'Scanning source frames…':'Inspect selected source video (24 samples)')+'</button>'+
  '<button class="small" type="button" id="toolsCancelVisual" '+(busy?'':'disabled')+'>Cancel visual inspection</button>'+
  '<p id="toolsVisualScanStatus" class="tiny muted" role="status">'+esc(status||'No new visual scan is running.')+'</p>'+
  '<button class="full" type="button" id="toolsExportVisual" '+(rows?'':'disabled')+'>Download visual inspection metadata (JSON)</button>'+
  '<div class="production-list">'+(rows||'<p class="tiny muted">No original video frames have been inspected in this project yet.</p>')+'</div></details>';
}
