import {uid} from './model.js';
import {openAudioReader} from './audio-reader.js';
/** Whisper transcription with overlapping windows, word reconciliation, and optional gap checks. */
let modelCache=null,modelName=null;

const supportedTiming=new Map();
export const isAttentionTimestampError=error=>/cross[\s_-]?attentions?|output_attentions|alignment_heads|return_token_timestamps|word[- ]level timestamps? (?:is |are )?(?:not supported|unavailable)/i.test(String(error?.message||error));
const isSegmentTimestampError=error=>isAttentionTimestampError(error)||/timestamps?.*(?:unsupported|not supported|unavailable|cannot|not implemented)|(?:unsupported|cannot|not available).*timestamps?|return_timestamps.*(?:invalid|unsupported)/i.test(String(error?.message||error));
/** Use attention-based word timing when available, then segment timing, then plain text.
 * Cache the model's working mode so later windows don't repeat the same inference failure. */
export async function recognizeWindow(whisper,pcm,{modelKey='default',preference='auto',onFallback=()=>{}}={}){
 const allowed=preference==='plain'?['plain']:preference==='word'?['word','segment','plain']:['segment','plain'];
 const cacheKey=`${modelKey}:${preference}`;const cached=supportedTiming.get(cacheKey),levels=cached&&allowed.includes(cached)?allowed.slice(allowed.indexOf(cached)):allowed;
 for(let i=0;i<levels.length;i++){
  const mode=levels[i];
  try{
   const options=mode==='word'?{return_timestamps:'word'}:mode==='segment'?{return_timestamps:true}:{return_timestamps:false};
   const result=await whisper(pcm,options);
   if(!result||typeof result.text!=='string'&&!Array.isArray(result.chunks))throw Error('Transcription model returned no readable result');
   supportedTiming.set(cacheKey,mode);
   return {result,mode};
  }catch(error){
   const canFallback=(mode==='word'&&isAttentionTimestampError(error))||(mode==='segment'&&isSegmentTimestampError(error));
   if(!canFallback||i===levels.length-1)throw error;
   onFallback(mode==='word'?'Whisper export lacks word-alignment attention outputs; using segment timestamps instead.':'Segment timestamps unavailable; using transcription with estimated timings.');
  }
 }
 throw Error('No compatible transcription timing mode');
}

/** Legacy single-file decode has been removed: long video uploads must never call file.arrayBuffer(). */
async function engine(settings,onProgress){if(modelName===settings.whisperModel&&modelCache)return modelCache;const mod=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');const opts={device:settings.processing==='webgpu'&&navigator.gpu?'webgpu':'wasm',dtype:settings.processing==='webgpu'&&navigator.gpu?'q4':'q8',progress_callback:p=>{if(p.status==='progress')onProgress(0,`Downloading Whisper: ${Math.round(p.progress||0)}%`)}};try{modelCache=await mod.pipeline('automatic-speech-recognition',settings.whisperModel,opts)}catch(e){if(opts.device!=='webgpu')throw e;opts.device='wasm';opts.dtype='q8';modelCache=await mod.pipeline('automatic-speech-recognition',settings.whisperModel,opts)}modelName=settings.whisperModel;return modelCache}
export function wordsFromResult(result,assetId,offset,length,mode='word'){
 const list=Array.isArray(result?.chunks)&&result.chunks.length?result.chunks:[{text:result?.text||'',timestamp:[0,length]}];
 const words=[];
 for(const ch of list){
  const tokens=String(ch.text||'').trim().split(/\s+/).filter(Boolean);
  if(!tokens.length)continue;
  const raw=Array.isArray(ch.timestamp)?ch.timestamp:null;
  const start=raw&&Number.isFinite(Number(raw[0]))?Number(raw[0]):0;
  const end=raw&&raw[1]!=null&&Number.isFinite(Number(raw[1]))?Number(raw[1]):length;
  const a=offset+Math.max(0,Math.min(length,start));
  const b=offset+Math.max(Math.min(length,a-offset+.02),Math.min(length,end));
  const timing=mode==='word'&&raw&&tokens.length===1?'model-word':'estimated';
  for(let i=0;i<tokens.length;i++){
   const from=a+(b-a)*i/tokens.length,to=a+(b-a)*(i+1)/tokens.length;
   if(to<=from)continue;
   words.push({id:uid(),assetId,start:from,end:to,text:tokens[i],speaker:'Speaker 1',confidence:null,timing});
  }
 }
 return words;
}
export function reconcileWords(words,eps=.12){
 const ordered=[...words].sort((a,b)=>a.start-b.start||a.end-b.end),out=[];
 for(const w of ordered){if(w.end<=w.start)continue;let identical=false;
  for(let i=out.length-1;i>=0&&out[i].start>=w.start-eps;i--){if(Math.abs(out[i].start-w.start)<eps&&out[i].text.trim().toLowerCase()===w.text.trim().toLowerCase()){identical=true;break}}
  if(!identical)out.push(w)
 }return out
}
/** Audits long low-word-density intervals with significant signal energy. Energy ≠ speech, so these are review flags. */
export function auditGaps(pcm,words,{sampleRate=16000,minSeconds=1.8,windowSeconds=.6}={}){
  if(!pcm?.length)return [];const win=Math.max(1,Math.round(windowSeconds*sampleRate)),groups=[];const sorted=[...words].sort((a,b)=>a.start-b.start);
  let active=null,wordIndex=0;for(let start=0;start<pcm.length;start+=win){const stop=Math.min(pcm.length,start+win);let sum=0;for(let i=start;i<stop;i+=4)sum+=pcm[i]*pcm[i];const rms=Math.sqrt(sum/Math.ceil((stop-start)/4));const a=start/sampleRate,b=stop/sampleRate;while(wordIndex<sorted.length&&sorted[wordIndex].end<=a)wordIndex++;const covered=wordIndex<sorted.length&&sorted[wordIndex].start<b&&sorted[wordIndex].end>a;const unexplained=rms>.015&&!covered;
    if(unexplained){if(!active)active={start:a,end:b,maxRms:rms};else{active.end=b;active.maxRms=Math.max(active.maxRms,rms)}}
    else if(active){if(active.end-active.start>=minSeconds)groups.push({...active,confidence:'needs-review'});active=null}
  }if(active&&active.end-active.start>=minSeconds)groups.push({...active,confidence:'needs-review'});return groups
}
/** Merge adjacent flagged audio intervals across independent decoding windows. */
export function mergeGapFlags(gaps){
 const out=[];
 for(const g of [...gaps].sort((a,b)=>a.start-b.start)){
  if(!(g.end>g.start))continue;
  const prev=out.at(-1);
  if(prev&&g.start<=prev.end+.5){prev.end=Math.max(prev.end,g.end);prev.maxRms=Math.max(prev.maxRms,g.maxRms||0)}
  else out.push({...g});
 }
 return out;
}
export async function transcribeWithReader(reader,assetId,settings,whisper,onProgress=()=>{},shouldStop=()=>false,{startAt=0,onCheckpoint=null,onPartial=null}={}){
 const chunkSec=Math.max(8,Math.min(29,Number(settings.transcriptionChunk)||12)),overlap=1.5,total=reader.duration;
 if(!(total>0)||!Number.isFinite(total))throw Error('Could not determine the recording duration');
 if(!Number.isFinite(startAt)||startAt<0||startAt>total)throw Error('Invalid transcription resume time');
 let pendingWords=[],pendingGaps=[],processedUntil=startAt,processed=0,savedWords=0;
 const segments=[];
 const flush=async()=>{
  if(!onCheckpoint)return;
  const w=reconcileWords(pendingWords),g=mergeGapFlags(pendingGaps);
  if(!w.length&&!g.length&&processedUntil<=startAt)return;
  await onCheckpoint({words:w,gaps:g,nextAt:processedUntil,total});
  savedWords+=w.length;pendingWords=[];pendingGaps=[];
 };
 try{
  for(let start=startAt;start<total;start+=chunkSec){
   if(shouldStop())throw Error('Transcription paused; completed sections have been retained');
   const a=Math.max(0,start-overlap),end=Math.min(total,start+chunkSec),b=Math.min(total,end+overlap);
   onProgress(start/total,'Decoding audio '+Math.floor(start/60)+'m / '+Math.ceil(total/60)+'m · memory-bounded window');
   // Request only 8–32 seconds from the container, never the complete uploaded video.
   const pcm=await reader.readRange(a,b);
   if(shouldStop())throw Error('Transcription paused; completed sections have been retained');
   const {result,mode}=await recognizeWindow(whisper,pcm,{
    modelKey:settings.whisperModel,preference:settings.transcriptionTiming||'auto',
    onFallback:message=>onProgress(start/total,message)
   });
   const words=wordsFromResult(result,assetId,a,b-a,mode);
   const newWords=words.filter(word=>{const mid=(word.start+word.end)/2;return mid>=start-.03&&mid<end+.03});
   pendingWords.push(...newWords);
   // Deliver visible captions after EVERY Whisper inference; disk checkpointing remains less frequent.
   if(onPartial)await onPartial({assetId,words:newWords,from:start,to:end,total});
   const localWords=words.map(w=>({...w,start:w.start-a,end:w.end-a}));
   const review=auditGaps(pcm,localWords).map(g=>({...g,start:Math.max(start,a+g.start),end:Math.min(end,a+g.end)})).filter(g=>g.end-g.start>0.5);
   pendingGaps.push(...review);
   processedUntil=end;processed++;segments.push({from:start,to:end});
   onProgress(end/total,'Transcribed '+Math.round(end)+'s / '+Math.round(total)+'s · '+(savedWords+pendingWords.length)+' words');
   if(onCheckpoint&&processed%3===0)await flush();
   if(shouldStop()){await flush();throw Error('Transcription paused; completed sections have been retained')}
  }
  await flush();
  onProgress(1,'Transcription completed through '+Math.floor(total/60)+'m recording');
  return {words:onCheckpoint?[]:reconcileWords(pendingWords),gaps:onCheckpoint?[]:mergeGapFlags(pendingGaps),segments,total,nextAt:total};
 }catch(e){
  if(onCheckpoint&&pendingWords.length||onCheckpoint&&pendingGaps.length)await flush();
  throw e;
 }
}
export async function transcribe(file,assetId,settings,onProgress=()=>{},shouldStop=()=>false,options={}){
 let reader;
 onProgress(0,'Opening streaming audio decoder');
 try{
  reader=await (options.readerFactory||openAudioReader)(file,{durationHint:options.durationHint,onStatus:msg=>onProgress(0,msg)});
  if(shouldStop())throw Error('Transcription paused');
  onProgress(0,'Loading Whisper model locally');
  const whisper=options.whisper||await engine(settings,onProgress);
  return await transcribeWithReader(reader,assetId,settings,whisper,onProgress,shouldStop,options);
 }finally{reader?.close()}
}
/** Re-analyze every flagged interval with short independent decoded windows. */
export async function retryGaps(file,assetId,settings,gaps,onProgress=()=>{},shouldStop=()=>false,options={}){
 if(!gaps?.length)return [];
 let reader;
 try{
  reader=await (options.readerFactory||openAudioReader)(file,{durationHint:options.durationHint});
  const whisper=options.whisper||await engine(settings,onProgress),out=[];
  const targets=gaps.flatMap((g,i)=>{const x=[];for(let start=g.start;start<g.end;start+=20)x.push({index:i,start,end:Math.min(start+20,g.end)});return x});
  for(let i=0;i<targets.length;i++){
   if(shouldStop())throw Error('Gap retry paused');
   const w=targets[i],a=Math.max(0,w.start-1.5),b=Math.min(reader.duration,w.end+1.5);
   onProgress(i/targets.length,'Retrying gap '+(w.index+1)+'/'+gaps.length);
   const pcm=await reader.readRange(a,b);
   const {result,mode}=await recognizeWindow(whisper,pcm,{
    modelKey:settings.whisperModel,preference:settings.transcriptionTiming||'auto',
    onFallback:msg=>onProgress(i/targets.length,msg)
   });
   out.push(...wordsFromResult(result,assetId,a,b-a,mode).filter(word=>word.end>w.start&&word.start<w.end));
  }
  onProgress(1,'Retried all '+gaps.length+' flagged intervals');
  return reconcileWords(out);
 }finally{reader?.close()}
}
