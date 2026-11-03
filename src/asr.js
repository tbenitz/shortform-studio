import {uid} from './model.js';
/** Whisper transcription with overlapping windows, word reconciliation, and optional gap checks. */
let modelCache=null,modelName=null;

const supportedTiming=new Map();
export const isAttentionTimestampError=error=>/cross[\s_-]?attentions?|output_attentions|alignment_heads|return_token_timestamps|word[- ]level timestamps? (?:is |are )?(?:not supported|unavailable)/i.test(String(error?.message||error));
const isSegmentTimestampError=error=>/timestamps?.*(?:unsupported|not supported|unavailable|cannot|not implemented)|(?:unsupported|cannot|not available).*timestamps?|return_timestamps.*(?:invalid|unsupported)/i.test(String(error?.message||error));
/** Use attention-based word timing when available, then segment timing, then plain text.
 * Cache the model's working mode so later windows don't repeat the same inference failure. */
export async function recognizeWindow(whisper,pcm,{modelKey='default',preference='auto',onFallback=()=>{}}={}){
 const allowed=preference==='plain'?['plain']:preference==='segment'?['segment','plain']:['word','segment','plain'];
 const cached=supportedTiming.get(modelKey),levels=cached&&allowed.includes(cached)?allowed.slice(allowed.indexOf(cached)):allowed;
 for(let i=0;i<levels.length;i++){
  const mode=levels[i];
  try{
   const options=mode==='word'?{return_timestamps:'word'}:mode==='segment'?{return_timestamps:true}:{return_timestamps:false};
   const result=await whisper(pcm,options);
   if(!result||typeof result.text!=='string'&&!Array.isArray(result.chunks))throw Error('Transcription model returned no readable result');
   supportedTiming.set(modelKey,mode);
   return {result,mode};
  }catch(error){
   const canFallback=(mode==='word'&&isAttentionTimestampError(error))||(mode==='segment'&&isSegmentTimestampError(error));
   if(!canFallback||i===levels.length-1)throw error;
   onFallback(mode==='word'?'Whisper export lacks word-alignment attention outputs; using segment timestamps instead.':'Segment timestamps unavailable; using transcription with estimated timings.');
  }
 }
 throw Error('No compatible transcription timing mode');
}

export async function decodeAudio(file){const ctx=new (window.AudioContext||window.webkitAudioContext)();try{const buf=await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));const target=16000;let data=new Float32Array(Math.ceil(buf.duration*target));const ratio=buf.sampleRate/target;for(let i=0;i<data.length;i++){let pos=i*ratio,index=Math.floor(pos),frac=pos-index;let v=0;for(let channel=0;channel<buf.numberOfChannels;channel++){const ch=buf.getChannelData(channel);v+=(ch[index]||0)*(1-frac)+(ch[index+1]||0)*frac}data[i]=v/buf.numberOfChannels}return data}finally{await ctx.close()}}
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
export async function transcribe(file,assetId,settings,onProgress=()=>{},shouldStop=()=>false){onProgress(0,'Loading transcription engine');const whisper=await engine(settings,onProgress);if(shouldStop())throw Error('Transcription canceled');onProgress(0,'Decoding audio locally');const pcm=await decodeAudio(file);const chunkSec=Math.max(8,Math.min(29,Number(settings.transcriptionChunk)||20)),overlap=1.5,words=[],segments=[];const total=pcm.length/16000;
 for(let start=0;start<total;start+=chunkSec){if(shouldStop())throw Error('Transcription canceled');const a=Math.max(0,start-overlap),b=Math.min(total,start+chunkSec+overlap);const portion=pcm.subarray(Math.floor(a*16000),Math.ceil(b*16000));onProgress(start/total,`Recognizing ${start.toFixed(0)}–${Math.min(total,start+chunkSec).toFixed(0)}s (overlapping windows)`);const {result:res,mode}=await recognizeWindow(whisper,portion,{modelKey:settings.whisperModel,preference:settings.transcriptionTiming||'auto',onFallback:message=>onProgress(start/total,message)});const decoded=wordsFromResult(res,assetId,a,b-a,mode);for(const w of decoded){const mid=(w.start+w.end)/2;if(mid>=start-.03&&mid<start+chunkSec+.03)words.push(w)}segments.push({from:start,to:Math.min(total,start+chunkSec)});
 }const cleaned=reconcileWords(words);const gaps=auditGaps(pcm,cleaned);onProgress(1,`Transcribed ${cleaned.length} words; ${gaps.length} possible audio gaps to review`);return {words:cleaned,segments,gaps};
}
/** Re-analyze every flagged interval, not only the first, using context padding. */
export async function retryGaps(file,assetId,settings,gaps,onProgress=()=>{},shouldStop=()=>false){
 if(!gaps?.length)return [];const whisper=await engine(settings,onProgress),pcm=await decodeAudio(file),out=[];
 const targets=gaps.flatMap((g,i)=>{const x=[];for(let start=g.start;start<g.end;start+=20){const end=Math.min(start+20,g.end);x.push({index:i,gap:g,start,end})}return x});
 for(let i=0;i<targets.length;i++){
  if(shouldStop())throw Error('Gap retry canceled');const chunk=targets[i],a=Math.max(0,chunk.start-1.5),b=Math.min(pcm.length/16000,chunk.end+1.5);
  onProgress(i/targets.length,`Retrying interval ${chunk.index+1}/${gaps.length} · window ${i+1}/${targets.length}`);
  const {result:output,mode}=await recognizeWindow(whisper,pcm.subarray(Math.floor(a*16000),Math.ceil(b*16000)),{modelKey:settings.whisperModel,preference:settings.transcriptionTiming||'auto',onFallback:message=>onProgress(i/targets.length,message)});
  out.push(...wordsFromResult(output,assetId,a,b-a,mode).filter(w=>w.end>chunk.start&&w.start<chunk.end));
 }
 onProgress(1,`Retried all ${gaps.length} intervals in ${targets.length} bounded audio windows`);return reconcileWords(out)
}
